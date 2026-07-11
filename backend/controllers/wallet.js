const supabase = require('../config/supabase');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// ─── Razorpay client ─────────────────────────────────────────────────────────
const getRazorpay = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || key_id === 'YOUR_RAZORPAY_KEY') {
    throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID in .env');
  }
  return new Razorpay({ key_id, key_secret });
};

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

    const { data: newBalance, error: updateErr } = await supabase.rpc('increment_wallet_balance', { p_user_id: userId, p_amount: amount });
    if (updateErr) throw updateErr;

    await supabase.from('transactions').insert({
      user_id: userId,
      amount,
      type: 'Deposit',
      status: 'Success',
      notes: 'Manual deposit',
    });

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

    // Deduct immediately and create a pending withdrawal request
    const { data: newBalance, error: updateErr } = await supabase.rpc('increment_wallet_balance', { p_user_id: userId, p_amount: -amount });
    if (updateErr) throw updateErr;

    await supabase.from('withdrawal_requests').insert({
      user_id: userId,
      amount,
      upi_id,
      upi_name: upi_name || '',
      status: 'pending',
    });

    await supabase.from('transactions').insert({
      user_id: userId,
      amount: -amount,
      type: 'Withdraw',
      status: 'Pending',
      notes: `Withdrawal to UPI: ${upi_id}`,
    });

    res.json({ success: true, message: 'Withdrawal request submitted', main_balance: newBalance });
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
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

    const newBonus = parseFloat(wallet.bonus_balance || 0) + bonusAmount;
    await supabase.from('wallets').update({ bonus_balance: newBonus, updated_at: new Date().toISOString() }).eq('user_id', userId);

    await supabase.from('transactions').insert({
      user_id: userId,
      amount: bonusAmount,
      type: 'CheckIn',
      status: 'Success',
      notes: 'Daily Check-In Reward',
    });

    res.json({ success: true, message: 'Check-In successful', bonusEarned: bonusAmount, bonus_balance: newBonus });
  } catch (err) {
    console.error('[checkIn]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/wallet/create-order ─ create Razorpay order ───────────────────
const createOrder = async (req, res) => {
  const amount = parseFloat(req.body.amount);
  if (!amount || amount < 100) {
    return res.status(400).json({ success: false, message: 'Minimum amount is ₹100' });
  }

  try {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${req.user.id}_${Date.now()}`,
    });
    res.json({ success: true, order });
  } catch (err) {
    console.error('[createOrder]', err.message);
    res.status(500).json({ success: false, error: err.message || 'Razorpay order creation failed' });
  }
};

// ─── POST /api/wallet/verify-payment ─ verify + credit wallet ────────────────
const verifyPayment = async (req, res) => {
  const userId = req.user.id;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount) {
    return res.status(400).json({ success: false, message: 'Missing payment fields' });
  }

  // ── Idempotency check — prevent replay attacks ────────────────────────────
  const { data: existingTxn } = await supabase
    .from('transactions')
    .select('id')
    .eq('razorpay_payment_id', razorpay_payment_id)
    .maybeSingle();

  if (existingTxn) {
    return res.status(409).json({ success: false, message: 'Payment already processed' });
  }

  // ── Signature verification ────────────────────────────────────────────────
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || keySecret === 'YOUR_RAZORPAY_SECRET') {
    return res.status(500).json({ success: false, message: 'Razorpay not configured' });
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Invalid payment signature' });
  }

  // ── Credit wallet ─────────────────────────────────────────────────────────
  try {
    const parsedAmount = parseFloat(amount);

    const { data: wallet, error: fetchErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

    // Check first recharge bonus (10%)
    const { data: existingDeposits } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'Deposit')
      .limit(1);

    const isFirst = !existingDeposits?.length;
    const bonus = isFirst ? parseFloat((parsedAmount * 0.1).toFixed(2)) : 0;
    const totalCredit = parsedAmount + bonus;

    const { data: newBalance, error: updateErr } = await supabase.rpc('increment_wallet_balance', { p_user_id: userId, p_amount: totalCredit });
    if (updateErr) throw updateErr;

    // Log the transaction with payment ID for idempotency
    await supabase.from('transactions').insert({
      user_id: userId,
      amount: parsedAmount,
      type: 'Deposit',
      status: 'Success',
      notes: `Razorpay (${razorpay_payment_id})`,
      razorpay_payment_id,
    });

    if (bonus > 0) {
      await supabase.from('transactions').insert({
        user_id: userId,
        amount: bonus,
        type: 'First Recharge Bonus (10%)',
        status: 'Success',
        notes: 'Auto applied on first deposit',
      });
    }

    // Update user total_recharge + VIP level
    const { data: user } = await supabase.from('users').select('total_recharge').eq('id', userId).maybeSingle();
    const newTotal = (user?.total_recharge || 0) + parsedAmount;
    const newVip = newTotal >= 100000 ? 'Master' : newTotal >= 50000 ? 'Diamond' : newTotal >= 25000 ? 'Gold' : newTotal >= 10000 ? 'Silver' : 'Bronze';
    await supabase.from('users').update({ total_recharge: newTotal, vip_level: newVip }).eq('id', userId);

    res.json({
      success: true,
      message: bonus > 0 ? `Payment verified! ₹${parsedAmount} + ₹${bonus} first recharge bonus credited` : 'Payment verified and wallet credited',
      main_balance: newBalance,
      bonus_applied: bonus,
    });
  } catch (err) {
    console.error('[verifyPayment]', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getWallet, deposit, withdraw, checkIn, createOrder, verifyPayment };
