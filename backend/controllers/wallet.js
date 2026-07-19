const supabase = require('../config/supabase');
const crypto = require('crypto');
// ─── GET /api/wallet ─ fetch wallet for current user ─────────────────────────
const getWallet = async (req, res) => {
  const userId = req.user.id;
  try {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

    res.json({ success: true, wallet });
  } catch (err) {
    console.error('[getWallet]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/wallet/deposit ─ admin/internal use (no Razorpay) ─────────────
const deposit = async (req, res) => {
  const userId = req.user.id;
  const amount = parseFloat(req.body.amount);

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }

  try {
    const { data: wallet, error: fetchErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

    let rpcError = null;
    let newBalance = 0;

    try {
      const previousBalance = parseFloat(wallet.main_balance || 0);
      newBalance = previousBalance + amount;
      
      const { error: wErr } = await supabase
        .from('wallets')
        .update({ main_balance: newBalance, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
        
      if (wErr) throw wErr;

      const { error: tErr } = await supabase.from('transactions').insert({
        user_id: userId,
        amount: amount,
        type: 'Deposit',
        status: 'Success',
        notes: 'Manual deposit',
        created_at: new Date().toISOString()
      });
      
      if (tErr) throw tErr;
    } catch (err) {
      rpcError = err;
    }

    if (rpcError) throw rpcError;

    res.json({ success: true, message: 'Deposit successful', main_balance: newBalance });
  } catch (err) {
    console.error('[deposit]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/wallet/withdraw ─ submit withdrawal request ───────────────────
const withdraw = async (req, res) => {
  const userId = req.user.id;
  const amount = parseFloat(req.body.amount);
  const { upi_id, upi_name } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }
  if (!upi_id) {
    return res.status(400).json({ success: false, message: 'UPI ID is required' });
  }

  try {
    const { data: wallet, error: fetchErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    if (parseFloat(wallet.main_balance || 0) < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Dynamic Admin Limits Validation
    const { data: adminSettings } = await supabase
      .from('platform_settings')
      .select('min_withdrawal, max_withdrawal')
      .eq('id', 1)
      .single();

    const minW = adminSettings?.min_withdrawal || 300;
    const maxW = adminSettings?.max_withdrawal || 50000;

    if (amount < minW) {
      return res.status(400).json({ success: false, message: `Minimum withdrawal is ₹${minW}` });
    }
    if (amount > maxW) {
      return res.status(400).json({ success: false, message: `Maximum withdrawal is ₹${maxW}` });
    }

    // Deduct immediately (atomically) and create a pending withdrawal request
    const walletBefore = parseFloat(wallet.main_balance || 0);
    const { data: newBalance, error: updateErr } = await supabase.rpc('deduct_wallet_balance', { 
      p_user_id: userId, 
      p_amount: amount
    });
    if (updateErr || newBalance === null) {
      return res.status(400).json({ success: false, message: 'Failed to process withdrawal. Try again.' });
    }

    const fee = parseFloat((amount * 0.10).toFixed(2));
    const netAmount = amount - fee;

    // Insert transaction log
    await supabase.from('transactions').insert({
      user_id: userId,
      amount: -amount,
      type: 'Withdraw',
      status: 'Pending',
      notes: `Withdrawal to UPI: ${upi_id} (Fee: ₹${fee}, Net: ₹${netAmount})`,
      previous_balance: walletBefore,
      new_balance: newBalance
    });

    const { data: withdrawalReq, error: insertErr } = await supabase.from('withdrawal_requests')
      .insert({
        user_id: userId,
        amount,
        fee_applied: fee,
        net_amount: netAmount,
        upi_id,
        upi_name: upi_name || '',
        status: 'pending',
      })
      .select()
      .single();
    if (insertErr) {
      console.error('[withdraw] insert error', insertErr);
      return res.status(500).json({ success: false, error: insertErr.message });
    }

    res.json({ success: true, message: 'Withdrawal request submitted', main_balance: newBalance, request: withdrawalReq });
  } catch (err) {
    console.error('[withdraw]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/wallet/checkin ─ daily check-in bonus ─────────────────────────
const checkIn = async (req, res) => {
  const userId = req.user.id;
  try {
    // Check if already checked in today (UTC date)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: existingCheckin } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'CheckIn')
      .gte('created_at', todayStart.toISOString())
      .maybeSingle();

    if (existingCheckin) {
      return res.status(400).json({ success: false, message: 'Already checked in today' });
    }

    const bonusAmount = 1; // ₹1 daily bonus

    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();
    const { data: profile } = await supabase.from('users').select('total_recharge').eq('id', userId).maybeSingle();
    if (!wallet || !profile) return res.status(404).json({ success: false, message: 'Wallet not found' });

    if (parseFloat(profile.total_recharge || 0) <= 0) {
      return res.status(403).json({ success: false, message: 'You must complete your first recharge to unlock Daily Check-In.' });
    }

    const newBalance = parseFloat(wallet.main_balance || 0) + bonusAmount;
    await supabase.from('wallets').update({ main_balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', userId);

    await supabase.from('transactions').insert({
      user_id: userId,
      amount: bonusAmount,
      type: 'CheckIn',
      status: 'Success',
      notes: 'Daily Check-In Reward',
    });

    res.json({ success: true, message: 'Check-In successful', bonusEarned: bonusAmount, main_balance: newBalance });
  } catch (err) {
    console.error('[checkIn]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};


// ─── GET /api/wallet/transactions ─ fetch user transactions ──────────────────
const getTransactions = async (req, res) => {
  const userId = req.user.id;
  try {
    const { data: txns, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, transactions: txns || [] });
  } catch (err) {
    console.error('[getTransactions]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};



// ─── POST /api/wallet/request-recharge ─ submit recharge request ─────────────
const requestRecharge = async (req, res) => {
  const userId = req.user.id;
  const { amount, utrNumber, senderName, senderUpi } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }
  if (!utrNumber) {
    return res.status(400).json({ success: false, message: 'UTR / Reference number is required' });
  }

  try {
    // Prevent duplicate UTR
    const { data: existingUtr } = await supabase
      .from('recharge_requests')
      .select('id')
      .eq('utr_number', utrNumber)
      .maybeSingle();
      
    if (existingUtr) {
      return res.status(400).json({ success: false, message: 'This UTR number has already been submitted.' });
    }

    // Capture device IP
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const deviceInfo = req.headers['user-agent'] || 'Unknown';

    // Check if first recharge
    const { data: user } = await supabase.from('users').select('total_recharge').eq('id', userId).maybeSingle();
    const isFirstRecharge = parseFloat(user?.total_recharge || 0) === 0;

    const { data: saved, error } = await supabase.from('recharge_requests').insert({
      user_id: userId,
      amount,
      utr_number: utrNumber,
      status: 'pending'
    }).select().single();

    if (error) throw error;

    res.json({ success: true, message: 'Recharge request submitted successfully', request: saved });
  } catch (err) {
    console.error('[requestRecharge]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getWallet, deposit, withdraw, checkIn, getTransactions, claimTask, requestRecharge };

async function claimTask(req, res) {
  try {
    const { taskId } = req.body;
    const userId = req.user.id;
    
    // Fetch user and wallet
    const { data: user } = await supabase.from('users').select('*, completed_tasks').eq('id', userId).maybeSingle();
    const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();
    
    if (!user || !wallet) return res.status(404).json({ success: false, message: 'User not found' });
    
    const completedTasks = user.completed_tasks || [];
    const totalRecharge = parseFloat(user.total_recharge || 0);
    
    // Define task rewards
    const tasks = {
      'registerEmail': { reward: 10, title: 'Register with Google' },
      'firstRecharge': { reward: 50, title: 'First Recharge' },
      'fiftyBets': { reward: 50, title: '50 Bets Milestone' },
      'inviteFriend': { reward: 25, title: 'Invite Friend' },
      'dailyLogin': { reward: 5, title: 'Daily Login' }
    };
    
    if (!tasks[taskId]) return res.status(400).json({ success: false, message: 'Invalid task ID' });
    const rewardAmount = tasks[taskId].reward;
    const taskTitle = tasks[taskId].title;
    
    // Validate conditions
    if (taskId === 'dailyLogin') {
      if (totalRecharge <= 0) {
        return res.status(403).json({ success: false, message: 'You must complete your first recharge to unlock Daily Tasks.' });
      }
      
      const today = new Date().toISOString().split('T')[0];
      if (user.last_daily_claim === today) {
        return res.status(400).json({ success: false, message: 'Already claimed today' });
      }
      
      await supabase.from('users').update({ last_daily_claim: today }).eq('id', userId);
    } else {
      // One-time tasks
      if (completedTasks.includes(taskId)) {
        return res.status(400).json({ success: false, message: 'Task already claimed' });
      }
      
      if (taskId === 'firstRecharge') {
        if (totalRecharge <= 0) return res.status(403).json({ success: false, message: 'Requirement not met: No recharge found.' });
      }
      
      if (taskId === 'fiftyBets') {
        const { count } = await supabase.from('bets').select('*', { count: 'exact', head: true }).eq('user_id', userId);
        if (count < 50) return res.status(403).json({ success: false, message: `Requirement not met: Only ${count}/50 bets placed.` });
      }
      
      if (taskId === 'inviteFriend') {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('referred_by', user.player_id);
        if (count < 1) return res.status(403).json({ success: false, message: 'Requirement not met: No referred friends found.' });
      }
      
      completedTasks.push(taskId);
      await supabase.from('users').update({ completed_tasks: completedTasks }).eq('id', userId);
    }
    
    // Credit reward to main balance
    const newBalance = parseFloat(wallet.main_balance || 0) + rewardAmount;
    await supabase.from('wallets').update({ main_balance: newBalance, updated_at: new Date().toISOString() }).eq('user_id', userId);
    
    // Add transaction record
    await supabase.from('transactions').insert({
      user_id: userId,
      amount: rewardAmount,
      type: 'Bonus',
      status: 'Success',
      notes: `Task Reward: ${taskTitle}`,
    });
    
    res.json({ success: true, message: 'Reward claimed successfully', rewardAmount, newBalance });
  } catch (err) {
    console.error('[claimTask]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};
