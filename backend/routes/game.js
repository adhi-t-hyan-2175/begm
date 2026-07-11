const express = require('express');
const router = express.Router();
const { placeBet, resolveBet, getBetHistory } = require('../controllers/game');
const { auth, verifyAdmin } = require('../middleware/auth');

router.post('/place-bet', auth, placeBet);
router.post('/resolve-bet', auth, verifyAdmin, resolveBet); // admin only
router.get('/history', auth, getBetHistory);

module.exports = router;
