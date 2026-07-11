const express = require('express');
const router = express.Router();
const communityController = require('../controllers/community');
const { auth } = require('../middleware/auth');

router.get('/leaderboard', communityController.getLeaderboards);
router.get('/tasks', auth, communityController.getTasks);
router.post('/tasks/claim', auth, communityController.claimTask);

module.exports = router;
