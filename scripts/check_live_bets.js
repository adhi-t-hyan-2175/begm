// check_live_bets.js
const fetch = require('node-fetch');
(async () => {
  try {
    const loginRes = await fetch('http://localhost:5000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'adithyan3847@gmail.com', password: process.env.ADMIN_PASSWORD || 'TREESADHI2175@20' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) { console.error('Login failed'); process.exit(1); }
    const token = loginData.token;
    const liveRes = await fetch('http://localhost:5000/api/admin/live-bets', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const liveData = await liveRes.json();
    console.log('Live bets response:', liveData);
  } catch (e) { console.error('Error:', e); }
})();
