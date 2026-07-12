const express = require('express');
const router = express.Router();
const { placeBet, resolveBet, getBetHistory } = require('../controllers/game');
const { auth, verifyAdmin } = require('../middleware/auth');

router.post('/place-bet', auth, placeBet);
router.post('/resolve-bet', auth, resolveBet); // Called by frontend WalletContext for all users
router.get('/history', auth, getBetHistory);

module.exports = router;
