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

// ─── POST /api/game/resolve-bet ─ called by game engine/admin ────────────────
const resolveBet = async (req, res) => {
  const { betId, result, payout } = req.body;

  if (!betId || !result) {
    return res.status(400).json({ success: false, error: 'Missing betId or result' });
  }

  try {
    const { data: bet, error: fetchErr } = await supabase
      .from('bets')
      .select('*')
      .eq('id', betId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!bet) return res.status(404).json({ success: false, error: 'Bet not found' });
    if (bet.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Bet already resolved' });
    }

    const won = String(bet.selection).toLowerCase().trim() === String(result).toLowerCase().trim();
    const payoutAmount = won ? parseFloat(payout || bet.amount * 2) : 0;
    const profit = won ? payoutAmount - bet.amount : -bet.amount;
    const newStatus = won ? 'won' : 'lost';

    let finalWalletAfter = bet.wallet_after;

    if (won && payoutAmount > 0) {
      // Fetch current wallet
      const { data: wallet, error: walletErr } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', bet.user_id)
        .maybeSingle();

      if (wallet && !walletErr) {
        const oldBalance = parseFloat(wallet.main_balance || 0);
        const newBalance = oldBalance + payoutAmount;

        // Credit wallet
        const { error: updateErr } = await supabase
          .from('wallets')
          .update({ main_balance: newBalance, updated_at: new Date().toISOString() })
          .eq('user_id', bet.user_id);

        if (updateErr) {
          console.error(`Failed to credit ${bet.user_id}:`, updateErr);
        } else {
          finalWalletAfter = newBalance;
          
          // Log transaction
          await supabase.from('transactions').insert({
            user_id: bet.user_id,
            amount: payoutAmount,
            type: 'Win',
            status: 'Success',
            notes: `${bet.game_type} Period ${bet.period} — Won`,
            previous_balance: oldBalance,
            new_balance: newBalance
          });
        }
      } else {
         console.error(`Wallet fetch failed for ${bet.user_id}:`, walletErr);
      }
    }

    // Update bet record
    await supabase.from('bets').update({ 
      result, 
      payout: payoutAmount, 
      status: newStatus,
      profit: profit,
      wallet_after: finalWalletAfter
    }).eq('id', betId);

    res.json({ success: true, won, payout: payoutAmount, status: newStatus });
  } catch (err) {
    console.error('[resolveBet]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/game/history ─ user bet history ─────────────────────────────────
const getBetHistory = async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;

  try {
    const { data: bets, error } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ success: true, bets: bets || [] });
  } catch (err) {
    console.error('[getBetHistory]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/game/resolve-bets-batch ─ batch process to prevent race conditions ───
const resolveBetsBatch = async (req, res) => {
  const { bets } = req.body;
  const userId = req.user.id;

  if (!bets || !Array.isArray(bets) || bets.length === 0) {
    return res.status(400).json({ success: false, error: 'Missing bets array' });
  }

  try {
    let totalPayout = 0;
    const resolvedIds = [];
    const transactions = [];

    // 1. Fetch current wallet balance
    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (walletErr) throw walletErr;
    let currentBalance = parseFloat(wallet?.main_balance || 0);

    // 2. Process each bet sequentially for database records
    for (const betInput of bets) {
      const { betId, result, payout } = betInput;

      const { data: bet } = await supabase
        .from('bets')
        .select('*')
        .eq('id', betId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!bet || bet.status !== 'pending') continue;

      const won = String(bet.selection).toLowerCase().trim() === String(result).toLowerCase().trim();
      const payoutAmount = won ? parseFloat(payout || bet.amount * 2) : 0;
      const profit = won ? payoutAmount - bet.amount : -bet.amount;
      const newStatus = won ? 'won' : 'lost';

      if (won && payoutAmount > 0) {
        totalPayout += payoutAmount;
        const newBalance = currentBalance + payoutAmount;
        
        transactions.push({
          user_id: userId,
          amount: payoutAmount,
          type: 'Win',
          status: 'Success',
          notes: `${bet.game_type} Period ${bet.period} — Won`,
          previous_balance: currentBalance,
          new_balance: newBalance
        });
        
        currentBalance = newBalance;
      }

      await supabase.from('bets').update({ 
        result, 
        payout: payoutAmount, 
        status: newStatus,
        profit: profit,
        wallet_after: currentBalance
      }).eq('id', betId);
      
      resolvedIds.push(betId);
    }

    // 3. One atomic wallet update for the total payout
    if (totalPayout > 0) {
      await supabase
        .from('wallets')
        .update({ main_balance: currentBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
        
      if (transactions.length > 0) {
        await supabase.from('transactions').insert(transactions);
      }
    }

    res.json({ success: true, message: 'Batch resolved', resolvedCount: resolvedIds.length, main_balance: currentBalance });
  } catch (err) {
    console.error('[resolveBetsBatch]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { placeBet, resolveBet, resolveBetsBatch, getBetHistory };
