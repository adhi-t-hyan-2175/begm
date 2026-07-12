const express = require('express');
const router = express.Router();
const { deposit, withdraw, checkIn, getWallet, createOrder, verifyPayment, getTransactions, handleWebhook } = require('../controllers/wallet');
const { auth } = require('../middleware/auth');

router.post('/deposit', auth, deposit);
router.post('/withdraw', auth, withdraw);
router.post('/checkin', auth, checkIn);
router.get('/', auth, getWallet);
router.get('/transactions', auth, getTransactions);

router.post('/create-order', auth, createOrder);
router.post('/verify-payment', auth, verifyPayment);
router.post('/webhook', handleWebhook);

module.exports = router;
