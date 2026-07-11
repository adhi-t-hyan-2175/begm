const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/auth');
const {
  getAllUsers,
  getRechargeRequests,
  approveRecharge,
  getWithdrawalRequests,
  approveWithdrawal,
  rejectWithdrawal,
  getUserTransactions,
  setUserStatus,
  getStats,
} = require('../controllers/admin');


// Apply verifyAdmin middleware to all routes in this file
router.use(verifyAdmin);

// Users
router.get('/users', getAllUsers);
router.post('/set-user-status', setUserStatus);

// Recharges
router.get('/recharge-requests', getRechargeRequests);
router.post('/approve-recharge', approveRecharge);

// Withdrawals
router.get('/withdrawal-requests', getWithdrawalRequests);
router.post('/approve-withdrawal', approveWithdrawal);
router.post('/reject-withdrawal', rejectWithdrawal);

// History
router.get('/transactions/:userId', getUserTransactions);

// Stats dashboard
router.get('/stats', getStats);

module.exports = router;

