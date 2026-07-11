const express = require('express');
const router = express.Router();
const { deposit, withdraw, checkIn, getWallet, createOrder, verifyPayment } = require('../controllers/wallet');
const { auth } = require('../middleware/auth');

router.post('/deposit', auth, deposit);
router.post('/withdraw', auth, withdraw);
router.post('/checkin', auth, checkIn);
router.get('/', auth, getWallet);

router.post('/create-order', auth, createOrder);
router.post('/verify-payment', auth, verifyPayment);

module.exports = router;
