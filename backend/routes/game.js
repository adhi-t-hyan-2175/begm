const express = require('express');
const router = express.Router();
const { placeBet, resolveBet } = require('../controllers/game');

router.post('/place-bet', placeBet);
router.post('/resolve-bet', resolveBet);

module.exports = router;
