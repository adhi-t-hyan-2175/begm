const express = require('express');
const router = express.Router();
const { placeBet, resolveBet, resolveBetsBatch, getBetHistory } = require('../controllers/game');
const { auth, verifyAdmin } = require('../middleware/auth');

router.post('/place-bet', auth, placeBet);
router.post('/resolve-bet', auth, resolveBet); // Called by frontend WalletContext for all users
router.post('/resolve-bets-batch', auth, resolveBetsBatch);
router.get('/history', auth, getBetHistory);

module.exports = router;
