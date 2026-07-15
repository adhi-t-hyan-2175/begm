const rateLimit = require('express-rate-limit');

// 1. Admin Login Limits
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 admin login requests per windowMs
  message: { success: false, message: 'Too many admin login attempts from this IP, please try again after 15 minutes' }
});

// 2. Recharge/Withdrawal Limits (Prevent spamming)
const financialRequestLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 requests per minute
  message: { success: false, message: 'Please wait a moment before submitting another financial request.' }
});

// 3. Betting Limits
const bettingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 bets per minute
  message: { success: false, message: 'Betting rate limit exceeded. Slow down.' }
});

// 4. Auth/OTP Limits
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  message: { success: false, message: 'Too many authentication attempts, please try again later.' }
});

// 5. Global API Limits (catch-all)
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});

module.exports = {
  adminLoginLimiter,
  financialRequestLimiter,
  bettingLimiter,
  authLimiter,
  globalApiLimiter
};
