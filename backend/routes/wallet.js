const express = require('express');
const router = express.Router();
const { deposit, withdraw, checkIn, getWallet, getTransactions, claimTask } = require('../controllers/wallet');
const { auth } = require('../middleware/auth');

router.post('/deposit', auth, deposit);
router.post('/withdraw', auth, withdraw);
router.post('/checkin', auth, checkIn);
router.post('/claim-task', auth, claimTask);
router.get('/', auth, getWallet);
router.get('/transactions', auth, getTransactions);

module.exports = router;
