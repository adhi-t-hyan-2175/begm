const supabase = require('../config/supabase');

// GET /api/admin/users — all users with wallets
exports.getAllUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id, phone, nickname, vip_level, status, total_recharge, created_at,
        wallets ( main_balance, bonus_balance )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = users.map(u => ({
      id: u.id,
      phone: u.phone,
      nickname: u.nickname,
      vip_level: u.vip_level,
      status: u.status,
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

// GET /api/admin/recharge-requests — pending recharges
exports.getRechargeRequests = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recharge_requests')
      .select('*, users(nickname, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, requests: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/admin/approve-recharge
exports.approveRecharge = async (req, res) => {
  try {
    const { requestId } = req.body;

    const { data: req_, error } = await supabase
      .from('recharge_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error || !req_) return res.status(404).json({ success: false, error: 'Request not found' });

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', req_.user_id)
      .single();

    // Check first recharge
    const { data: existingTxns } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', req_.user_id)
      .eq('type', 'Recharge')
      .limit(1);

    const isFirst = !existingTxns?.length;
    const bonus = isFirst ? req_.amount * 0.1 : 0;
    const totalCredit = req_.amount + bonus;

    // Update wallet
    await supabase
      .from('wallets')
      .update({ main_balance: (wallet?.main_balance || 0) + totalCredit, updated_at: new Date().toISOString() })
      .eq('user_id', req_.user_id);

    // Update user total_recharge and vip_level
    const { data: user } = await supabase.from('users').select('total_recharge').eq('id', req_.user_id).single();
    const newTotal = (user?.total_recharge || 0) + req_.amount;
    const newVip = newTotal >= 100000 ? 'Master' : newTotal >= 50000 ? 'Diamond' : newTotal >= 25000 ? 'Gold' : newTotal >= 10000 ? 'Silver' : 'Bronze';
    await supabase.from('users').update({ total_recharge: newTotal, vip_level: newVip }).eq('id', req_.user_id);

    // Record transactions
    await supabase.from('transactions').insert({ user_id: req_.user_id, type: 'Recharge', amount: req_.amount, status: 'Success', notes: 'Admin approved' });
    if (bonus > 0) {
      await supabase.from('transactions').insert({ user_id: req_.user_id, type: 'First Recharge Bonus (10%)', amount: bonus, status: 'Success', notes: 'Auto applied' });
    }

    // Mark request approved
    await supabase.from('recharge_requests').update({ status: 'approved' }).eq('id', requestId);

    res.json({ success: true, credited: totalCredit, bonus, newVip });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/admin/withdrawal-requests — pending
exports.getWithdrawalRequests = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*, users(nickname, phone)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, requests: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/admin/approve-withdrawal
exports.approveWithdrawal = async (req, res) => {
  try {
    const { requestId } = req.body;

    const { data: wr } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!wr) return res.status(404).json({ success: false, error: 'Not found' });

    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', wr.user_id).single();
    if ((wallet?.main_balance || 0) < wr.amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    await supabase.from('wallets').update({
      main_balance: (wallet.main_balance || 0) - wr.amount,
      updated_at: new Date().toISOString()
    }).eq('user_id', wr.user_id);

    await supabase.from('transactions').insert({
      user_id: wr.user_id, type: 'Withdraw', amount: -wr.amount, status: 'Success', notes: `UPI: ${wr.upi_id}`
    });

    await supabase.from('withdrawal_requests').update({ status: 'completed' }).eq('id', requestId);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/admin/reject-withdrawal
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { requestId } = req.body;
    await supabase.from('withdrawal_requests').update({ status: 'rejected' }).eq('id', requestId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/admin/transactions/:userId — user transaction history
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

// POST /api/admin/set-user-status
exports.setUserStatus = async (req, res) => {
  try {
    const { userId, status } = req.body;
    await supabase.from('users').update({ status }).eq('id', userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
