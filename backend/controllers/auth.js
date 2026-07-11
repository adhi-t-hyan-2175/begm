const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Wallet, Transaction } = require('../models');
const msg91 = require('../services/msg91');

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
    const mobile = phone.startsWith('91') ? phone : `91${phone}`;
    
    const result = await msg91.sendOTP(mobile);
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
    const mobile = phone.startsWith('91') ? phone : `91${phone}`;
    await msg91.verifyOTP(mobile, otp);

    // Check duplicate
    const existing = await User.findOne({ where: { phone } });

    if (existing) {
      return res.status(400).json({ success: false, error: 'Phone number already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Resolve invite code
    let referredById = null;
    if (inviteCode) {
      const referrer = await User.findOne({ 
        where: { 
          $or: [
            { id: inviteCode },
            { nickname: inviteCode }
          ]
        }
      });
      if (referrer) referredById = referrer.id;
    }

    // Insert user
    const newUser = await User.create({
      phone,
      password_hash: passwordHash,
      nickname,
      vipStatus: 'Bronze',
      status: 'Active',
      role: 'user',
      totalRecharge: 0,
      referredBy: referredById,
    });

    // Create wallet
    await Wallet.create({
      userId: newUser.id,
      balance: 0,
      bonusBalance: 0,
    });

    // Credit referrer ₹25
    if (referredById) {
      const refWallet = await Wallet.findOne({ where: { userId: referredById } });

      if (refWallet) {
        refWallet.balance += 25;
        await refWallet.save();

        await Transaction.create({
          userId: referredById,
          currencyType: 'Main',
          transactionType: 'Referral Reward',
          amount: 25,
          status: 'Success',
          description: `Friend ${nickname} joined via invite`,
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
        vip_level: newUser.vipStatus,
        status: newUser.status,
        role: newUser.role,
        total_recharge: newUser.totalRecharge,
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

    const user = await User.findOne({ where: { phone } });

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
    const wallet = await Wallet.findOne({ where: { userId: user.id } });

    const token = jwt.sign({ id: user.id, phone: user.phone, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        vip_level: user.vipStatus,
        status: user.status,
        role: user.role,
        total_recharge: user.totalRecharge,
        main_balance: wallet ? wallet.balance : 0,
        bonus_balance: wallet ? wallet.bonusBalance : 0,
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

    const user = await User.findByPk(decoded.id);
    const wallet = await Wallet.findOne({ where: { userId: decoded.id } });

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        vip_level: user.vipStatus,
        status: user.status,
        role: user.role,
        total_recharge: user.totalRecharge,
        main_balance: wallet ? wallet.balance : 0,
        bonus_balance: wallet ? wallet.bonusBalance : 0,
      },
    });
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
