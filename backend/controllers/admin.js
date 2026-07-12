const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

// ─── POST /api/admin/login ───────────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
  const { username, password } = req.body;
  if (username === 'Treesadhi' && password === 'TREESADHI2175@') {
    const token = jwt.sign(
      { admin: true, username },
      process.env.JWT_SECRET || 'super_secret_admin_key',
      { expiresIn: '24h' }
    );
    return res.json({ success: true, token, admin: { username } });
  }
  return res.status(401).json({ success: false, message: 'Invalid username or password' });
};

// ─── GET /api/admin/me ───────────────────────────────────────────────────────
exports.adminMe = async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ admin: null });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_admin_key');
    if (decoded.admin) {
      return res.json({ admin: { username: decoded.username } });
    }
    return res.status(401).json({ admin: null });
  } catch (err) {
    return res.status(401).json({ admin: null });
  }
};

// ─── GET /api/admin/users — all users with wallets ───────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id, player_id, email, nickname, vip_level, status, role, total_recharge, created_at,
        wallets ( main_balance, bonus_balance )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = users.map(u => ({
      id: u.id,
      player_id: u.player_id,
      email: u.email,
      nickname: u.nickname,
      vip_level: u.vip_level,
      status: u.status,
      role: u.role,
      total_recharge: u.total_recharge,
      wallet: u.wallets?.main_balance || 0,
      bonus_balance: u.wallets?.bonus_balance || 0,
      created_at: u.created_at,
    }));

    res.json({ success: true, users: mapped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/recharge-requests — pending recharges ────────────────────
exports.getRechargeRequests = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recharge_requests')
      .select('*, users(nickname, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, requests: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/admin/approve-recharge ────────────────────────────────────────
exports.approveRecharge = async (req, res) => {
  try {
    const { requestId, userId, amount } = req.body;
    console.log('[approveRecharge] incoming request body:', req.body);
    console.log('[approveRecharge] user attached from token:', req.user);

    // ATOMIC UPDATE: Only update if it is currently 'pending'. 
    // This strictly prevents double-clicks from crediting twice.
    const { data: req_, error: updateErr } = await supabase
      .from('recharge_requests')
      .update({ status: 'approved' })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select()
      .single();

    let targetUserId = userId;
    let targetAmount = amount;

    if (updateErr || !req_) {
      console.warn('[approveRecharge] Request not found in DB (might be local fallback), proceeding with provided data.');
      if (!targetUserId || !targetAmount) {
         return res.status(400).json({ success: false, error: 'Request not found and no fallback data provided' });
      }
    } else {
      targetUserId = req_.user_id;
      targetAmount = req_.amount;
    }

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    const totalCredit = targetAmount;

    await supabase
      .from('wallets')
      .update({ main_balance: (wallet?.main_balance || 0) + totalCredit, updated_at: new Date().toISOString() })
      .eq('user_id', targetUserId);

    // Update VIP
    const { data: user } = await supabase.from('users').select('total_recharge').eq('id', targetUserId).single();
    const newTotal = (user?.total_recharge || 0) + targetAmount;
    const newVip = newTotal >= 100000 ? 'Master' : newTotal >= 50000 ? 'Diamond' : newTotal >= 25000 ? 'Gold' : newTotal >= 10000 ? 'Silver' : 'Bronze';
    await supabase.from('users').update({ total_recharge: newTotal, vip_level: newVip }).eq('id', targetUserId);

    await supabase.from('transactions').insert({ user_id: targetUserId, type: 'Recharge', amount: targetAmount, status: 'Success', notes: 'Admin approved' });

    res.json({ success: true, credited: totalCredit, bonus: 0, newVip });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/admin/reject-recharge ────────────────────────────────────────
exports.rejectRecharge = async (req, res) => {
  try {
    const { requestId } = req.body;
    if (!requestId) return res.status(400).json({ success: false, error: 'requestId required' });

    await supabase
      .from('recharge_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/withdrawal-requests ──────────────────────────────────────
exports.getWithdrawalRequests = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*, users(nickname, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, requests: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/admin/approve-withdrawal ──────────────────────────────────────
exports.approveWithdrawal = async (req, res) => {
  try {
    const { requestId } = req.body;

    const { data: wr } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!wr) return res.status(404).json({ success: false, error: 'Not found' });
    if (wr.status !== 'pending') return res.status(400).json({ success: false, error: 'Already processed' });

    // Balance was already deducted at request time — just mark complete and log
    await supabase.from('transactions').update({ status: 'Success' })
      .eq('user_id', wr.user_id)
      .eq('type', 'Withdraw')
      .eq('status', 'Pending')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()); // last 24h

    await supabase.from('withdrawal_requests').update({ status: 'completed' }).eq('id', requestId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/admin/reject-withdrawal ───────────────────────────────────────
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { requestId } = req.body;

    const { data: wr } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!wr) return res.status(404).json({ success: false, error: 'Not found' });
    if (wr.status !== 'pending') return res.status(400).json({ success: false, error: 'Already processed' });

    // Refund the amount back to wallet
    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', wr.user_id).maybeSingle();
    if (wallet) {
      await supabase.from('wallets').update({
        main_balance: parseFloat(wallet.main_balance || 0) + wr.amount,
        updated_at: new Date().toISOString()
      }).eq('user_id', wr.user_id);

      await supabase.from('transactions').insert({
        user_id: wr.user_id,
        amount: wr.amount,
        type: 'Withdrawal Refund',
        status: 'Success',
        notes: 'Admin rejected withdrawal request',
      });
    }

    await supabase.from('withdrawal_requests').update({ status: 'rejected' }).eq('id', requestId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/transactions/:userId ─────────────────────────────────────
exports.getUserTransactions = async (req, res) => {
  try {
    const { userId } = req.params;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, transactions: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/admin/set-user-status ─────────────────────────────────────────
exports.setUserStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;
    if (!['Active', 'Frozen'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status. Use Active or Frozen.' });
    }
    await supabase.from('users').update({ status }).eq('id', userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/all-deposits ─────────────────────────────────────────────
exports.getAllDeposits = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, users(player_id, nickname, email)')
      .eq('type', 'Deposit')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ success: true, deposits: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/stats ─ dashboard summary ─────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const [usersRes, txnRes, betsRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('transactions').select('amount, type').eq('status', 'Success'),
      supabase.from('bets').select('amount, status'),
    ]);

    const totalUsers = usersRes.count || 0;
    const txns = txnRes.data || [];
    const bets = betsRes.data || [];

    const totalDeposits = txns.filter(t => t.type === 'Deposit').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const totalWithdrawals = Math.abs(txns.filter(t => t.type === 'Withdraw').reduce((s, t) => s + parseFloat(t.amount || 0), 0));
    const totalBets = bets.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
    const totalRevenue = totalBets - bets.filter(b => b.status === 'won').reduce((s, b) => s + parseFloat(b.amount || 0), 0);

    res.json({ success: true, stats: { totalUsers, totalDeposits, totalWithdrawals, totalBets, totalRevenue } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
