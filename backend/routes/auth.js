const express = require('express');
const router = express.Router();
const { login, register, me, sendOtp } = require('../controllers/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', me);
router.post('/send-otp', sendOtp);

module.exports = router;
