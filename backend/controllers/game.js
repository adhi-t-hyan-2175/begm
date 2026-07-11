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
    const newBalance = parseFloat(wallet.main_balance) - betAmount;
    await supabase
      .from('wallets')
      .update({ main_balance: newBalance, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

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
      })
      .select()
      .single();

    if (betErr) throw betErr;

    // Log transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      amount: -betAmount,
      type: 'Bet',
      status: 'Success',
      notes: `${game_type} Period ${period} — ${selection}`,
    });

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

    const won = bet.selection === result;
    const payoutAmount = won ? parseFloat(payout || bet.amount * 2) : 0;
    const newStatus = won ? 'won' : 'lost';

    // Update bet record
    await supabase.from('bets').update({ result, payout: payoutAmount, status: newStatus }).eq('id', betId);

    if (won && payoutAmount > 0) {
      // Credit wallet
      const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', bet.user_id).maybeSingle();
      if (wallet) {
        await supabase.from('wallets').update({
          main_balance: parseFloat(wallet.main_balance || 0) + payoutAmount,
          updated_at: new Date().toISOString()
        }).eq('user_id', bet.user_id);

        await supabase.from('transactions').insert({
          user_id: bet.user_id,
          amount: payoutAmount,
          type: 'Win',
          status: 'Success',
          notes: `${bet.game_type} Period ${bet.period} — Won`,
        });
      }
    }

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

module.exports = { placeBet, resolveBet, getBetHistory };
