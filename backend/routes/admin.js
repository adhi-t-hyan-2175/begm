const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/auth');
const {
  adminLogin,
  adminMe,
  getAllUsers,
  getRechargeRequests,
  approveRecharge,
  rejectRecharge,
  getWithdrawalRequests,
  approveWithdrawal,
  rejectWithdrawal,
  getUserTransactions,
  setUserStatus,
  getStats,
  getStats,
  getAllDeposits,
  getSettings,
  updateSettings,
  getAuditLogs,
  getGameAnalytics,
  getFinancialAnalytics,
  setGameResult,
} = require('../controllers/admin');
const { getBackups, createBackup, deleteBackup } = require('../controllers/backup');

// Unprotected Admin Login Routes
router.post('/login', adminLogin);
router.get('/me', adminMe);
router.get('/settings', getSettings);

// Apply verifyAdmin middleware to all subsequent routes
router.use(verifyAdmin);

// Users
router.get('/users', getAllUsers);
router.post('/set-user-status', setUserStatus);
router.post('/edit-user', require('../controllers/admin').editUser);

// Recharges
router.get('/recharge-requests', getRechargeRequests);
router.post('/approve-recharge', approveRecharge);
router.post('/reject-recharge', rejectRecharge);
router.get('/all-deposits', getAllDeposits);

// Withdrawals
router.get('/withdrawal-requests', getWithdrawalRequests);
router.post('/approve-withdrawal', approveWithdrawal);
router.post('/reject-withdrawal', rejectWithdrawal);

// History
router.get('/transactions/:userId', getUserTransactions);

// Stats dashboard
router.get('/stats', getStats);
router.post('/update-settings', updateSettings);

// Analytics & Audit
router.get('/audit-logs', getAuditLogs);
router.get('/game-analytics', getGameAnalytics);
router.get('/financial-analytics', getFinancialAnalytics);
router.post('/set-game-result', setGameResult);

// Backups
router.get('/backups', getBackups);
router.post('/backups/create', createBackup);
router.delete('/backups/:name', deleteBackup);

module.exports = router;
