const express = require('express');
const router = express.Router();
const { me, upsertProfile } = require('../controllers/auth');

// Called after Google OAuth to create/retrieve the user profile
router.post('/upsert-profile', upsertProfile);

// Get current user info from Supabase JWT
router.get('/me', me);

module.exports = router;
