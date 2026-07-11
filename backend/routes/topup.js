const express = require('express');
const router = express.Router();
const topupController = require('../controllers/topup');
const { auth } = require('../middleware/auth');

router.get('/products', topupController.getProducts);
router.post('/order', auth, topupController.createOrder);
router.get('/history', auth, topupController.getHistory);

module.exports = router;
