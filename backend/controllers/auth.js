const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');
const otpService = require('../services/otp');

const JWT_SECRET = process.env.JWT_SECRET || 'gambb_secret_2175';

// ─── Helper: generate VIP level from total_recharge ──────────────────────────
function getVipLevel(totalRecharge = 0) {
  if (totalRecharge >= 100000) return 'Master';
  if (totalRecharge >= 50000)  return 'Diamond';
  if (totalRecharge >= 25000)  return 'Gold';
  if (totalRecharge >= 10000)  return 'Silver';
  return 'Bronze';
}

// ─── POST /api/auth/send-otp ──────────────────────────────────────────────────
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }
    
    // Country code fallback logic. MSG91 expects it. E.g. '919876543210'
    const result = await otpService.sendOTP(phone);
    return res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { phone, password, nickname = 'Player', inviteCode, otp } = req.body;

    if (!phone || !password || !otp) {
      return res.status(400).json({ success: false, error: 'Phone, password, and OTP are required' });
    }

    // Verify OTP first
    await otpService.verifyOTP(phone, otp);

    // Check duplicate
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    if (existing) {
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Resolve invite code
    let referredById = null;
    if (inviteCode) {
      const { data: referrer } = await supabase
        .from('users')
        .select('id')
        .or(`id.eq.${inviteCode},nickname.ilike.${inviteCode}`)
        .single();
      if (referrer) referredById = referrer.id;
    }

    // Insert user
    const { data: newUser, error: insertErr } = await supabase
      .from('users')
      .insert({
        phone,
        password_hash: passwordHash,
        nickname,
        vip_level: 'Bronze',
        status: 'Active',
        role: 'user',
        total_recharge: 0,
        referred_by: referredById,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Create wallet
    await supabase.from('wallets').insert({
      user_id: newUser.id,
      main_balance: 0,
      bonus_balance: 0,
    });

    // Credit referrer ₹25
    if (referredById) {
      const { data: refWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', referredById)
        .single();

      if (refWallet) {
        await supabase
          .from('wallets')
          .update({ main_balance: (refWallet.main_balance || 0) + 25 })
          .eq('user_id', referredById);

        await supabase.from('transactions').insert({
          user_id: referredById,
          type: 'Referral Reward',
          amount: 25,
          status: 'Success',
          notes: `Friend ${nickname} joined via invite`,
        });
      }
    }

    const token = jwt.sign({ id: newUser.id, phone: newUser.phone, role: newUser.role }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        phone: newUser.phone,
        nickname: newUser.nickname,
        vip_level: newUser.vip_level,
        status: newUser.status,
        role: newUser.role,
        total_recharge: newUser.total_recharge,
      },
    });
  } catch (err) {
    console.error('[Register Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, error: 'Phone and password are required' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (!user) {
      return res.status(401).json({ success: false, error: 'Phone number not registered' });
    }

    if (user.status === 'Frozen') {
      return res.status(403).json({ success: false, error: 'Account is frozen. Contact support.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    // Fetch wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        vip_level: user.vip_level,
        status: user.status,
        role: user.role,
        total_recharge: user.total_recharge,
        main_balance: wallet?.main_balance || 0,
        bonus_balance: wallet?.bonus_balance || 0,
      },
    });
  } catch (err) {
    console.error('[Login Error]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── GET /api/auth/me — get current user from JWT ────────────────────────────
exports.me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .single();

    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', decoded.id)
      .single();

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        vip_level: user.vip_level,
        status: user.status,
        role: user.role,
        total_recharge: user.total_recharge,
        main_balance: wallet?.main_balance || 0,
        bonus_balance: wallet?.bonus_balance || 0,
      },
    });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
