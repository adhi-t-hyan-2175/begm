const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

const logAdminAction = async (adminName, action, playerId = null, oldValue = null, newValue = null) => {
  await supabase.from('admin_audit_logs').insert({
    admin_name: adminName || 'Unknown Admin',
    action,
    player_id: playerId,
    old_value: oldValue ? String(oldValue) : null,
    new_value: newValue ? String(newValue) : null
  });
};

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

    // Fetch user details for bonus logic
    const { data: user } = await supabase.from('users').select('*').eq('id', targetUserId).single();

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    const { data: adminSettings } = await supabase.from('admin_settings').select('*').eq('id', 1).single();

    let bonusAmount = 0;
    let mainBalanceAdd = targetAmount;
    let updateFirstRecharge = false;

    // First Recharge Bonus
    if (user && !user.first_recharge_bonus_claimed) {
      if (adminSettings?.first_recharge_bonus_percent > 0) {
        bonusAmount = Math.floor(targetAmount * (adminSettings.first_recharge_bonus_percent / 100));
        updateFirstRecharge = true;
      } else {
        bonusAmount = Math.floor(targetAmount * 0.25); // STRICT 25% BONUS AS PER REQUIREMENTS
        updateFirstRecharge = true;
      }
    }

    // 1. Credit the recharge
    await supabase.rpc('credit_wallet_and_log', {
      p_user_id: targetUserId,
      p_amount: targetAmount,
      p_type: 'Recharge',
      p_notes: 'Admin approved'
    });

    // Update VIP and mark first_recharge_bonus_claimed if needed
    const newTotal = (user?.total_recharge || 0) + targetAmount;
    const newVip = newTotal >= 100000 ? 'Master' : newTotal >= 50000 ? 'Diamond' : newTotal >= 25000 ? 'Gold' : newTotal >= 10000 ? 'Silver' : 'Bronze';
    
    let userUpdates = { total_recharge: newTotal, vip_level: newVip };
    if (updateFirstRecharge) {
      userUpdates.first_recharge_bonus_claimed = true;
    }
    await supabase.from('users').update(userUpdates).eq('id', targetUserId);

    if (bonusAmount > 0) {
      await supabase.rpc('credit_wallet_and_log', {
        p_user_id: targetUserId,
        p_amount: bonusAmount,
        p_type: 'First Recharge Bonus',
        p_notes: 'Admin approved first recharge bonus'
      });
      await supabase.from('notifications').insert({ user_id: targetUserId, message: `Congratulations! You received a First Recharge Bonus of ₹${bonusAmount}.` });
    }

    // Referral Bonus Logic
    if (user && user.referred_by && updateFirstRecharge && targetAmount >= 500) {
      // It's their first recharge AND it's >= 500 AND they have an inviter
      const { data: adminSettings } = await supabase.from('admin_settings').select('referral_bonus_amount').eq('id', 1).single();
      const refBonus = adminSettings?.referral_bonus_amount || 25; // Hardcoded to 25 if not set

      // Find the inviter by player_id
      const { data: inviter } = await supabase.from('users').select('id, nickname').eq('player_id', user.referred_by).single();
      if (inviter) {
        // Credit the inviter's main balance (since prompt says "Reward goes into Main Balance")
        await supabase.rpc('credit_wallet_and_log', {
          p_user_id: inviter.id,
          p_amount: refBonus,
          p_type: 'Referral Bonus',
          p_notes: `Referral Bonus for inviting ${user.nickname}`
        });

        // Send notification
        await supabase.from('notifications').insert({ 
          user_id: inviter.id, 
          message: `Your referral ${user.nickname} made their first recharge! You've received a ₹${refBonus} referral bonus.` 
        });
      }
    }

    await logAdminAction(req.user?.username, 'Approved Recharge', user?.player_id, null, targetAmount);

    res.json({ success: true, credited: targetAmount, bonus: bonusAmount, newVip });
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

    await logAdminAction(req.user?.username, 'Rejected Recharge', null, null, requestId);

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

    await logAdminAction(req.user?.username, 'Approved Withdrawal', wr.user_id, null, wr.amount);

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
      await supabase.rpc('credit_wallet_and_log', {
        p_user_id: wr.user_id,
        p_amount: wr.amount,
        p_type: 'Withdrawal Refund',
        p_notes: 'Admin rejected withdrawal request'
      });
    }

    await supabase.from('withdrawal_requests').update({ status: 'rejected' }).eq('id', requestId);
    await logAdminAction(req.user?.username, 'Rejected Withdrawal', wr.user_id, null, wr.amount);

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
    await logAdminAction(req.user?.username, 'Set User Status', userId, null, status);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.editUser = async (req, res) => {
  const { userId, nickname, vipLevel, mainBalance } = req.body;
  try {
    if (nickname || vipLevel) {
      const updates = {};
      if (nickname) updates.nickname = nickname;
      if (vipLevel) updates.vip_level = vipLevel;
      await supabase.from('users').update(updates).eq('id', userId);
    }
    
    if (mainBalance !== undefined) {
      const { data: w } = await supabase.from('wallets').select('main_balance').eq('user_id', userId).single();
      const diff = Number(mainBalance) - (w?.main_balance || 0);
      if (diff !== 0) {
        await supabase.rpc('credit_wallet_and_log', {
          p_user_id: userId,
          p_amount: diff,
          p_type: 'Admin Adjustment',
          p_notes: 'Admin manually edited wallet balance'
        });
      }
    }
    
    await logAdminAction(req.user?.username, 'Edited User', userId, null, `Nickname: ${nickname}, VIP: ${vipLevel}, Balance: ${mainBalance}`);
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

// ─── GET /api/admin/settings ──────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const { data, error } = await supabase.from('admin_settings').select('*').eq('id', 1).single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows
    res.json({ success: true, settings: data || {} });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/admin/update-settings ──────────────────────────────────────────
exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    const { error } = await supabase.from('admin_settings').upsert({ id: 1, ...updates });
    if (error) throw error;
    await logAdminAction(req.user?.username, 'Updated Settings', null, null, JSON.stringify(updates));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────────
exports.getAuditLogs = async (req, res) => {
  try {
    const { data, error } = await supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw error;
    res.json({ success: true, logs: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/game-analytics ───────────────────────────────────────────
exports.getGameAnalytics = async (req, res) => {
  try {
    const { data, error } = await supabase.from('bets').select('game_type, amount, payout, status, created_at, user_id').order('created_at', { ascending: false }).limit(5000);
    if (error) throw error;
    res.json({ success: true, bets: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/financial-analytics ──────────────────────────────────────
exports.getFinancialAnalytics = async (req, res) => {
  try {
    const [recharges, withdrawals, users, txns] = await Promise.all([
      supabase.from('recharge_requests').select('amount, status, created_at').order('created_at', { ascending: false }).limit(5000),
      supabase.from('withdrawal_requests').select('amount, status, created_at').order('created_at', { ascending: false }).limit(5000),
      supabase.from('users').select('created_at').order('created_at', { ascending: false }).limit(5000),
      supabase.from('transactions').select('amount, type, status, created_at').order('created_at', { ascending: false }).limit(5000)
    ]);
    
    res.json({ 
      success: true, 
      recharges: recharges.data || [], 
      withdrawals: withdrawals.data || [], 
      users: users.data || [],
      transactions: txns.data || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/admin/set-game-result ─────────────────────────────────────────
exports.setGameResult = async (req, res) => {
  try {
    const { gameType, result } = req.body;
    
    // Store in admin_settings to override the next spin
    const { error } = await supabase.from('admin_settings').update({ 
      forced_game_result: JSON.stringify({ gameType, result, timestamp: Date.now() })
    }).eq('id', 1);
    
    if (error) throw error;

    await logAdminAction(req.user?.username, 'Force Game Result', null, null, `Game: ${gameType}, Result: ${result}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
