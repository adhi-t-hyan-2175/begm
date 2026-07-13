const express = require('express');
const router = express.Router();
const { placeBet, getBetHistory, setGameResultOverride, fetchOrCreateGameResult } = require('../controllers/game');
const { auth, verifyAdmin } = require('../middleware/auth');

router.post('/place-bet', auth, placeBet);
router.post('/admin/override', auth, verifyAdmin, setGameResultOverride);
router.post('/result/sync', auth, fetchOrCreateGameResult);
router.get('/history', auth, getBetHistory);

module.exports = router;
