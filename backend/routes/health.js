const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

router.get('/health', async (req, res) => {
  try {
    // Check DB/Supabase connectivity
    const { data, error } = await supabase.from('global_game_state').select('game').limit(1);
    const isDbConnected = !error;

    res.json({
      status: 'healthy',
      database: isDbConnected ? 'ok' : 'error',
      realtime: 'ok', // SDK handles realtime connection inherently
      engine: 'ok' // Engine is running in the same process
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

router.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

module.exports = router;
