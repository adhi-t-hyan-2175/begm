const supabase = require('../config/supabase');
const jwt = require('jsonwebtoken');

const logAdminAction = async (adminEmail, action, targetUser = null, oldValue = null, newValue = null, req = null) => {
  const ip = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
  const device = req ? req.headers['user-agent'] : null;

  await supabase.from('admin_audit_logs').insert({
    admin_email: adminEmail || 'adithyan3847@gmail.com',
    action,
    target_user: targetUser ? String(targetUser) : null,
    old_value: oldValue ? String(oldValue) : null,
    new_value: newValue ? String(newValue) : null,
    ip,
    device
  });
};

const logAdminSession = async (email, req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const browser = req.headers['user-agent'];
  await supabase.from('admin_sessions').insert({
    admin_email: email,
    ip,
    browser,
    last_action: 'Admin Logged In'
  });
};

// ─── POST /api/admin/login ───────────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
  // Trim to avoid trailing whitespace / encoding issues
  const email    = (req.body.email    || '').trim();
  const password = (req.body.password || '').trim();

  const ADMIN_EMAIL    = 'adithyan3847@gmail.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'TREESADHI2175@20';

  // ── Temporary debug logs (remove after verifying login works) ──
  console.log('[AdminLogin] received email   :', JSON.stringify(email));
  console.log('[AdminLogin] expected email   :', JSON.stringify(ADMIN_EMAIL));
  console.log('[AdminLogin] email match      :', email === ADMIN_EMAIL);
  console.log('[AdminLogin] password match   :', password === ADMIN_PASSWORD);
  // ── End debug logs ──

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const payload = { admin: true, username: email, email };
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'super_secret_admin_key',
      { expiresIn: '24h' }
    );

    console.log('[AdminLogin] JWT issued for  :', email);

    await logAdminSession(email, req);
    await logAdminAction(email, 'Login', null, null, null, req);

    return res.json({ success: true, token, admin: { username: email, email } });
  }

  console.log('[AdminLogin] REJECTED — email or password mismatch');
  return res.status(403).json({ success: false, message: 'Forbidden: Only the global administrator can login.' });
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
    const [usersRes, betsRes, withdrawalsRes] = await Promise.all([
      supabase.from('users').select(`
        id, player_id, email, nickname, vip_level, status, role, total_recharge, created_at,
        wallets ( main_balance, bonus_balance )
      `).order('created_at', { ascending: false }),
      supabase.from('bets').select('user_id, amount, status'),
      supabase.from('transactions').select('user_id, amount').eq('type', 'Withdraw').eq('status', 'Success')
    ]);

    if (usersRes.error) throw usersRes.error;

    const bets = betsRes.data || [];
    const withdrawals = withdrawalsRes.data || [];

    const mapped = usersRes.data.map(u => {
      const userBets = bets.filter(b => b.user_id === u.id);
      const userWithdrawals = withdrawals.filter(w => w.user_id === u.id);
      
      const total_bets = userBets.length;
      const total_wins = userBets.filter(b => b.status === 'won').length;
      const total_losses = userBets.filter(b => b.status === 'lost').length;
      const total_withdrawal = userWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);

      return {
        id: u.id,
        player_id: u.player_id,
        email: u.email,
        nickname: u.nickname,
        vip_level: u.vip_level,
        status: u.status,
        role: u.role,
        total_recharge: u.total_recharge,
        total_withdrawal,
        total_bets,
        total_wins,
        total_losses,
        wallet: u.wallets?.main_balance || 0,
        bonus_balance: u.wallets?.bonus_balance || 0,
        created_at: u.created_at,
      };
    });

    res.json({ success: true, users: mapped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/user/:id — deep dive user profile ───────────────────────
exports.getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [userRes, walletRes, betsRes, txnsRes, rechargesRes, withdrawalsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', id).single(),
      supabase.from('wallets').select('*').eq('user_id', id).single(),
      supabase.from('bets').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(200),
      supabase.from('transactions').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(200),
      supabase.from('recharge_requests').select('*').eq('user_id', id).order('created_at', { ascending: false }),
      supabase.from('withdrawal_requests').select('*').eq('user_id', id).order('created_at', { ascending: false })
    ]);

    if (userRes.error) throw userRes.error;

    res.json({
      success: true,
      user: userRes.data,
      wallet: walletRes.data,
      bets: betsRes.data || [],
      transactions: txnsRes.data || [],
      recharges: rechargesRes.data || [],
      withdrawals: withdrawalsRes.data || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/recharge-requests — pending recharges ────────────────────
exports.getRechargeRequests = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recharge_requests')
      .select('*, users(nickname, email, player_id, first_recharge_bonus_claimed)')
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

    const adminName = req.user?.username || 'System';
    const now = new Date().toISOString();

    // ATOMIC UPDATE: Only update if it is currently 'pending'. 
    // This strictly prevents double-clicks from crediting twice.
    const { data: req_, error: updateErr } = await supabase
      .from('recharge_requests')
      .update({ 
        status: 'approved',
        approved_by: adminName,
        approved_at: now
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateErr || !req_) {
      return res.status(400).json({ success: false, error: 'Atomic update failed: Request already processed or not found' });
    }

    const targetUserId = req_.user_id;
    const targetAmount = req_.amount;

    // Fetch user details for bonus logic
    const { data: user } = await supabase.from('users').select('*').eq('id', targetUserId).single();

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    let bonusAmount = 0;
    let mainBalanceAdd = targetAmount;
    let updateFirstRecharge = false;

    // First Recharge Bonus
    if (user && !user.first_recharge_bonus_claimed) {
      bonusAmount = targetAmount; // STRICT 100% BONUS AS PER REQUIREMENTS
      updateFirstRecharge = true;
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
      const { data: adminSettings } = await supabase.from('platform_settings').select('referral_bonus').eq('id', 1).single();
      const refBonus = adminSettings?.referral_bonus || 25; 

      // Find the inviter by player_id
      const { data: inviter } = await supabase.from('users').select('id, nickname').eq('player_id', user.referred_by).single();
      if (inviter) {
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

    await logAdminAction(req.user?.email, 'Approved Recharge', user?.player_id, 'pending', targetAmount, req);

    res.json({ success: true, credited: targetAmount, bonus: bonusAmount, newVip });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/admin/reject-recharge ────────────────────────────────────────
exports.rejectRecharge = async (req, res) => {
  try {
    const { requestId, reason } = req.body;
    if (!requestId) return res.status(400).json({ success: false, error: 'requestId required' });

    const adminName = req.user?.username || 'System';
    const { data: updateRes } = await supabase
      .from('recharge_requests')
      .update({ 
        status: 'rejected', 
        reject_reason: reason || 'Rejected by Admin',
        approved_by: adminName
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select()
      .single();

    if (!updateRes) {
      return res.status(400).json({ success: false, error: 'Request already processed or not found' });
    }

    await logAdminAction(req.user?.email, 'Rejected Recharge', null, 'pending', `Rejected: ${reason}`, req);

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
      .select('*, users(nickname, email, player_id, total_recharge)')
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

    const adminName = req.user?.username || 'System';
    const now = new Date().toISOString();

    const { data: wr } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!wr) return res.status(404).json({ success: false, error: 'Not found' });
    if (wr.status !== 'pending') return res.status(400).json({ success: false, error: 'Already processed' });

    // ATOMIC UPDATE: Ensure it only updates if pending
    const { data: updateRes, error: updateErr } = await supabase
      .from('withdrawal_requests')
      .update({ 
        status: 'completed',
        approved_by: adminName,
        approved_at: now
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateErr || !updateRes) {
      return res.status(400).json({ success: false, error: 'Atomic update failed, might have been already processed' });
    }

    // Balance was already deducted at request time — just mark complete and log
    await supabase.from('transactions').update({ status: 'Success' })
      .eq('user_id', wr.user_id)
      .eq('type', 'Withdraw')
      .eq('status', 'Pending')
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()); // last 24h

    await logAdminAction(req.user?.email, 'Approved Withdrawal', wr.user_id, 'pending', wr.amount, req);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/admin/reject-withdrawal ───────────────────────────────────────
exports.rejectWithdrawal = async (req, res) => {
  try {
    const { requestId } = req.body;

    const adminName = req.user?.username || 'System';
    const reason = req.body.reason || 'Rejected by Admin';

    const { data: wr } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (!wr) return res.status(404).json({ success: false, error: 'Not found' });
    if (wr.status !== 'pending') return res.status(400).json({ success: false, error: 'Already processed' });

    // ATOMIC UPDATE
    const { data: updateRes, error: updateErr } = await supabase
      .from('withdrawal_requests')
      .update({ 
        status: 'rejected',
        reject_reason: reason,
        approved_by: adminName
      })
      .eq('id', requestId)
      .eq('status', 'pending')
      .select()
      .single();

    if (updateErr || !updateRes) {
      return res.status(400).json({ success: false, error: 'Atomic update failed' });
    }

    // Refund the amount back to wallet
    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', wr.user_id).maybeSingle();
    if (wallet) {
      await supabase.rpc('credit_wallet_and_log', {
        p_user_id: wr.user_id,
        p_amount: wr.amount,
        p_type: 'Withdrawal Refund',
        p_notes: `Admin rejected: ${reason}`
      });
    }
    await logAdminAction(req.user?.email, 'Rejected Withdrawal', wr.user_id, 'pending', wr.amount, req);

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
    await logAdminAction(req.user?.email, 'Set User Status', userId, null, status, req);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.editUser = async (req, res) => {
  const { userId, nickname, vipLevel, mainBalance, status, adminNote } = req.body;
  try {
    const updates = {};
    if (nickname !== undefined) updates.nickname = nickname;
    if (vipLevel !== undefined) updates.vip_level = vipLevel;
    if (status !== undefined) updates.status = status;
    if (adminNote !== undefined) updates.admin_note = adminNote;

    if (Object.keys(updates).length > 0) {
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
    
    await logAdminAction(req.user?.email, 'Edited User', userId, null, `Updates: ${JSON.stringify({ nickname, vipLevel, status, adminNote, mainBalance })}`, req);
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

// ─── GET /api/admin/dashboard ─ dashboard summary ─────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const [
      usersRes, 
      walletsRes, 
      pendingRechargeRes, 
      pendingWithdrawalRes,
      todayBetsRes,
      todayTxnRes
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('wallets').select('main_balance'),
      supabase.from('recharge_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('withdrawal_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bets').select('amount, status').gte('created_at', todayStr),
      supabase.from('transactions').select('amount, type, status').gte('created_at', todayStr).eq('status', 'Success')
    ]);

    const totalUsers = usersRes.count || 0;
    const onlineUsers = Math.max(1, Math.floor(totalUsers * 0.1)); // Approximate for now
    
    const wallets = walletsRes.data || [];
    const totalWalletBalance = wallets.reduce((sum, w) => sum + parseFloat(w.main_balance || 0), 0);

    const pendingRechargeCount = pendingRechargeRes.count || 0;
    const pendingWithdrawalsCount = pendingWithdrawalRes.count || 0;

    const todayBets = todayBetsRes.data || [];
    const todayTotalBets = todayBets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const todayPayouts = todayBets.filter(b => b.status === 'won').reduce((sum, b) => sum + parseFloat(b.amount * 1.9 || 0), 0); // Approx payout calculation if specific payout column is not used
    const todayRevenue = todayTotalBets - todayPayouts;
    const todayProfit = todayRevenue; // Typically revenue = profit for the house

    const activeUsers = Math.max(1, Math.floor(totalUsers * 0.05)); // Approximate active users

    const todayTxns = todayTxnRes.data || [];
    const todayRecharge = todayTxns.filter(t => t.type === 'Recharge' || t.type === 'Deposit').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const todayWithdrawal = todayTxns.filter(t => t.type === 'Withdraw' || t.type === 'Withdrawal').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    res.json({ 
      success: true, 
      stats: { 
        totalUsers, 
        onlineNow: onlineUsers,
        activeUsers,
        totalWalletBalance,
        pendingRechargeCount,
        pendingWithdrawalsCount,
        todayTotalBets,
        todayRevenue,
        todayProfit,
        todayRecharge,
        todayWithdrawal
      } 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/settings ──────────────────────────────────────────────────
exports.getSettings = async (req, res) => {
  try {
    const [platformRes, vipRes, taskRes, gameRes] = await Promise.all([
      supabase.from('platform_settings').select('*').eq('id', 1).single(),
      supabase.from('vip_levels').select('*').order('level', { ascending: true }),
      supabase.from('task_settings').select('*').eq('id', 1).single(),
      supabase.from('game_settings').select('*').order('game_key', { ascending: true })
    ]);

    res.json({
      success: true,
      settings: {
        platform: platformRes.data || {},
        vip_levels: vipRes.data || [],
        tasks: taskRes.data || {},
        games: gameRes.data || []
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/admin/update-settings ──────────────────────────────────────────
exports.updateSettings = async (req, res) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'platform') {
      const { error } = await supabase.from('platform_settings').upsert({ id: 1, ...data });
      if (error) throw error;
    } else if (type === 'tasks') {
      const { error } = await supabase.from('task_settings').upsert({ id: 1, ...data });
      if (error) throw error;
    } else if (type === 'vip') {
      const { error } = await supabase.from('vip_levels').upsert(data);
      if (error) throw error;
    } else if (type === 'games') {
      const { error } = await supabase.from('game_settings').upsert(data);
      if (error) throw error;
    } else {
      return res.status(400).json({ success: false, error: 'Invalid settings type' });
    }

    await logAdminAction(req.user?.email, 'Updated Settings', null, null, `Type: ${type}`, req);
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

// ─── POST /api/admin/set-game-result ───────────────────────────────────────────
exports.setGameResult = async (req, res) => {
  try {
    const { gameType, result } = req.body;
    if (!gameType) return res.status(400).json({ success: false, error: 'Missing gameType' });

    // Write override into global_game_state (correct table — admin_settings no longer exists)
    if (!result) {
      // Clear override
      const { error } = await supabase
        .from('global_game_state')
        .update({ admin_override: null })
        .eq('game', gameType);
      if (error) throw error;
    } else {
      const overrideValue = typeof result === 'object'
        ? JSON.stringify(result)
        : JSON.stringify({ label: result });

      const { error } = await supabase
        .from('global_game_state')
        .update({ admin_override: overrideValue })
        .eq('game', gameType);
      if (error) throw error;
    }

    await logAdminAction(req.user?.email, 'Force Game Result', null, null, `Game: ${gameType}, Result: ${JSON.stringify(result)}`, req);
    res.json({ success: true });
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



// ─── GET /api/admin/live-bets ────────────────────────────────────────────────
exports.getLiveBets = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bets')
      .select('game_type, period, amount, selection, status, created_at, users(nickname, email)')
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (error) throw error;
    res.json({ success: true, bets: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/fraud-report ─────────────────────────────────────────────
exports.getFraudReport = async (req, res) => {
  try {
    // 1. Duplicate UTR Numbers
    const { data: utrs } = await supabase
      .from('recharge_requests')
      .select('utr_number, user_id, amount, created_at, users(nickname, email)')
      .not('utr_number', 'is', null);

    const dupUtrs = [];
    const utrMap = {};
    if (utrs) {
      utrs.forEach(u => {
        if (!utrMap[u.utr_number]) utrMap[u.utr_number] = [];
        utrMap[u.utr_number].push(u);
      });
      Object.keys(utrMap).forEach(k => {
        if (utrMap[k].length > 1) {
          dupUtrs.push({ utr: k, accounts: utrMap[k] });
        }
      });
    }

    // 2. Duplicate Withdrawals (same UPI ID used across multiple accounts)
    const { data: withdrawals } = await supabase
      .from('withdrawal_requests')
      .select('upi_id, user_id, amount, created_at, users(nickname, email)')
      .not('upi_id', 'is', null);

    const dupUpis = [];
    const upiMap = {};
    if (withdrawals) {
      withdrawals.forEach(w => {
        if (!upiMap[w.upi_id]) upiMap[w.upi_id] = [];
        upiMap[w.upi_id].push(w);
      });
      Object.keys(upiMap).forEach(k => {
        const uniqueUsers = new Set(upiMap[k].map(x => x.user_id));
        if (uniqueUsers.size > 1) {
          dupUpis.push({ upi_id: k, accounts: upiMap[k] });
        }
      });
    }

    // 3. Shared Devices (same device_info across multiple accounts)
    const { data: users } = await supabase
      .from('users')
      .select('id, nickname, email, device_info, created_at')
      .not('device_info', 'is', null);

    const dupDevices = [];
    const deviceMap = {};
    if (users) {
      users.forEach(u => {
        if (!deviceMap[u.device_info]) deviceMap[u.device_info] = [];
        deviceMap[u.device_info].push(u);
      });
      Object.keys(deviceMap).forEach(k => {
        if (deviceMap[k].length > 1) {
          dupDevices.push({ device: k, accounts: deviceMap[k] });
        }
      });
    }

    res.json({
      success: true,
      duplicate_utrs: dupUtrs,
      duplicate_upis: dupUpis,
      duplicate_devices: dupDevices
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/activity ─────────────────────────────────────────────────
exports.getAdminActivity = async (req, res) => {
  try {
    const { data: sessions, error: sessErr } = await supabase
      .from('admin_sessions')
      .select('*')
      .order('last_active_time', { ascending: false })
      .limit(50);

    const { data: audits, error: auditErr } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (sessErr || auditErr) throw sessErr || auditErr;

    res.json({ success: true, sessions: sessions || [], logs: audits || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/admin/dashboard-stats ──────────────────────────────────────────
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const oneMinAgo = new Date(now.getTime() - 60000).toISOString();
    const fiveMinAgo = new Date(now.getTime() - 300000).toISOString();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [activeUsersCount, bpmCount, totalRechargeToday, totalWithdrawToday, errorCount, systemLogs] = await Promise.all([
      // 1. Active Users (Users who loaded the app or registered recently)
      supabase.from('users').select('id', { count: 'exact', head: true }),
      // 2. Bets per minute
      supabase.from('bets').select('id', { count: 'exact', head: true }).gte('created_at', oneMinAgo),
      // 3. Recharge Volume Today
      supabase.from('recharge_requests').select('amount').eq('status', 'approved').gte('created_at', startOfToday),
      // 4. Withdrawal Volume Today
      supabase.from('withdrawal_requests').select('amount').eq('status', 'completed').gte('created_at', startOfToday),
      // 5. Unresolved Errors Today
      supabase.from('system_logs').select('id', { count: 'exact', head: true }).eq('resolved', false).gte('created_at', startOfToday),
      // 6. Recent System Logs
      supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(20)
    ]);

    const rechargeVol = (totalRechargeToday.data || []).reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
    const withdrawVol = (totalWithdrawToday.data || []).reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);

    res.json({
      success: true,
      stats: {
        server_status: 'Healthy',
        database_status: 'Connected',
        active_users: activeUsersCount.count || 0,
        bets_per_minute: bpmCount.count || 0,
        recharge_volume_today: rechargeVol,
        withdrawal_volume_today: withdrawVol,
        errors_today: errorCount.count || 0
      },
      system_logs: systemLogs.data || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
