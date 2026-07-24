const supabase = require('../config/supabase');

// ─── POST /api/game/place-bet ─────────────────────────────────────────────────
const placeBet = async (req, res) => {
  const userId = req.user.id;
  const { game_type, period, round_id, amount, selection } = req.body;

  if (!game_type || !period || !round_id || !amount || !selection) {
    return res.status(400).json({ success: false, error: 'Missing required fields: game_type, period, round_id, amount, selection' });
  }

  const betAmount = parseFloat(amount);
  if (betAmount <= 0) {
    return res.status(400).json({ success: false, error: 'Bet amount must be positive' });
  }

  try {
    // 1. Ensure betting phase is open based on deterministic time calculation (closes after 00:30 countdown)
    const EPOCH = 1784738400000;
    const GAME_CONFIGS = {
      FastParity: { duration: 60, bettingDuration: 30 },
      Parity: { duration: 180, bettingDuration: 150 },
      Sapre: { duration: 180, bettingDuration: 150 },
      Dice: { duration: 60, bettingDuration: 30 },
      Wheelocity: { duration: 180, bettingDuration: 150 },
      AndarBahar: { duration: 60, bettingDuration: 30 }
    };
    const config = GAME_CONFIGS[game_type] || { duration: 60, bettingDuration: 30 };
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - EPOCH) / 1000));
    const secondsIntoPeriod = elapsedSeconds % config.duration;
    const isBettingOpen = secondsIntoPeriod < config.bettingDuration;

    if (!isBettingOpen) {
      return res.status(400).json({ success: false, error: 'Betting phase is closed for this period.' });
    }

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
        round_id,
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
    // 1. Fetch current game state
    const { data: state, error: stateErr } = await supabase.from('global_game_state').select('period, round_id').eq('game', game).single();
    if (stateErr || !state) return res.status(400).json({ success: false, error: 'Game state not found' });
    
    // 2. Check if a result already exists for this round in game_results
    const { data: existing } = await supabase.from('game_results').select('id').eq('game', game).eq('round_id', state.round_id).maybeSingle();
    if (existing) {
      return res.status(400).json({ success: false, error: 'Override disabled: The result for this round has already been revealed.' });
    }

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

// ─── POST /api/game/result/sync ─ Fetch global outcome ───
const fetchOrCreateGameResult = async (req, res) => {
  const { game, period, round_id } = req.body;

  try {
    // 1. Check if result already exists (generated by gameEngine)
    const { data: existing } = await supabase
      .from('game_results')
      .select('*')
      .eq('game', game)
      .eq('round_id', round_id)
      .maybeSingle();

    if (existing) {
      return res.json({ 
        success: true, 
        result: existing.result, 
        is_override: existing.is_override, 
        profit: existing.profit || 0, 
        totalBets: existing.total_bets || 0 
      });
    }

    // 2. If it doesn't exist yet, return pending so the frontend waits
    res.json({ success: true, result: null, is_override: false, profit: 0, totalBets: 0, status: 'pending' });

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
