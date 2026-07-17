// check_transactions.js
const path = require('path');
const fs = require('fs');
const envPath = path.resolve(__dirname, '../backend/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) process.env[match[1]] = match[2];
  });
}
const supabase = require('../backend/config/supabase');
(async () => {
  const testEmail = 'test_user@example.com';
  const { data: user, error: userErr } = await supabase.from('users').select('id').eq('email', testEmail).single();
  if (userErr) { console.error('User fetch error', userErr); return; }
  const { data: txs, error: txErr } = await supabase.from('transactions').select('*').eq('user_id', user.id);
  if (txErr) { console.error('Transactions fetch error', txErr); return; }
  console.log('All transactions for user', user.id, ':');
  console.log(txs);
  const winTx = txs.filter(t => t.type === 'Win');
  console.log('Win transactions count:', winTx.length);
})();
