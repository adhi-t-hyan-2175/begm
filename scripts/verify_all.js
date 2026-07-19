const http = require('http');
const fs = require('fs');

const token = fs.readFileSync('admin_token.txt', 'utf8').trim();
const baseOptions = {
  hostname: 'localhost',
  port: 5003,
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` },
};

const endpoints = [
  '/api/admin/me',
  '/api/admin/users',
  '/api/admin/recharge-requests',
  '/api/admin/withdrawal-requests',
  '/api/admin/live-bets',
  '/api/admin/dashboard',
  '/api/admin/settings',
];

function fetch(path) {
  return new Promise((resolve, reject) => {
    const options = { ...baseOptions, path };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (_) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  console.log('--- Admin Endpoint Verification (Port 5003) ---');
  for (const ep of endpoints) {
    try {
      const result = await fetch(ep);
      console.log(`\n${ep}:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error(`Error fetching ${ep}: ${err.message}`);
    }
  }
})();
