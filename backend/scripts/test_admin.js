require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const API_URL = 'http://localhost:5003/api/admin';
const GAME = 'FastParity';

// To bypass authentication, we might need a valid JWT or we might just use the DB to simulate it if the API requires an admin token.
// Wait, the API requires `verifyAdmin` middleware! So we need an admin token.
// Let's generate an admin token using the JWT_SECRET.
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: 'admin-test', role: 'admin', admin: true, email: 'adithyan3847@gmail.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const reqHeaders = { 
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}` 
};

async function testAdmin() {
  console.log('--- Admin Override Test ---');

  // Fetch current state
  const { data: state } = await supabase.from('global_game_state').select('*').eq('game', GAME).single();
  console.log(`Current State: ${state.status} | Round: ${state.round_id}`);

  // Test set-game-result
  try {
    const res = await fetch(`${API_URL}/set-game-result`, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({
        gameType: GAME,
        round_id: state.round_id,
        result: 'Red'
      })
    });
    const data = await res.json();
    console.log(`Response [${state.status}]:`, data);
  } catch (err) {
    console.log(`Error [${state.status}]:`, err.message);
  }
}

// Keep testing every 5 seconds to catch all phases
setInterval(testAdmin, 5000);
testAdmin();
