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

// ─── POST /api/wallet/webhook ─ Razorpay Webhook ──────────────────────────────
const handleWebhook = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(500).send('Webhook secret missing');
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).send('Signature missing');
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).send('Invalid signature');
    }
  } catch (err) {
    return res.status(400).send('Signature validation failed');
  }

  const event = req.body.event;
  if (event === 'payment.captured') {
    const payment = req.body.payload.payment.entity;
    const razorpay_payment_id = payment.id;
    const amount = payment.amount / 100;

    try {
      // 1. Get User ID from Order receipt
      const razorpay = getRazorpay();
      const order = await razorpay.orders.fetch(payment.order_id);
      if (!order || !order.receipt) return res.status(400).send('Order missing receipt');
      const userId = order.receipt.split('_')[1];

      // 2. Idempotency Check
      const { data: existingTxn } = await supabase
        .from('transactions')
        .select('id')
        .eq('razorpay_payment_id', razorpay_payment_id)
        .maybeSingle();

      if (existingTxn) {
        return res.json({ status: 'ok', message: 'Already processed' });
      }

      // 3. Credit Wallet
      const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();
      if (!wallet) return res.status(404).send('Wallet not found');

      // Check first recharge bonus (10%)
      const { data: existingDeposits } = await supabase
        .from('transactions').select('id').eq('user_id', userId).eq('type', 'Deposit').limit(1);

      const isFirst = !existingDeposits?.length;
      const bonus = isFirst ? parseFloat((amount * 0.1).toFixed(2)) : 0;
      const totalCredit = amount + bonus;

      await supabase.rpc('increment_wallet_balance', { p_user_id: userId, p_amount: totalCredit });

      await supabase.from('transactions').insert({
        user_id: userId,
        amount: amount,
        type: 'Deposit',
        status: 'Success',
        notes: `Razorpay (${razorpay_payment_id}) via Webhook`,
        razorpay_payment_id,
      });

      if (bonus > 0) {
        await supabase.from('transactions').insert({
          user_id: userId,
          amount: bonus,
          type: 'First Recharge Bonus (10%)',
          status: 'Success',
          notes: 'Auto applied on first deposit via Webhook',
        });
      }

      // Update VIP
      const { data: user } = await supabase.from('users').select('total_recharge').eq('id', userId).maybeSingle();
      const newTotal = (user?.total_recharge || 0) + amount;
      const newVip = newTotal >= 100000 ? 'Master' : newTotal >= 50000 ? 'Diamond' : newTotal >= 25000 ? 'Gold' : newTotal >= 10000 ? 'Silver' : 'Bronze';
      await supabase.from('users').update({ total_recharge: newTotal, vip_level: newVip }).eq('id', userId);

    } catch (err) {
      console.error('[Webhook] Processing error:', err.message);
      return res.status(500).send('Internal Server Error');
    }
  }

  res.json({ status: 'ok' });
};

module.exports = { getWallet, deposit, withdraw, checkIn, getTransactions };
