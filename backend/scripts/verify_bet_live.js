// verify_bet_live.js
// Script to create a test user, wallet, place a bet, and verify admin live bets endpoint.

require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
// Using global fetch available in Node 18+

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase env not set');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    // 1. Fetch an existing user (fallback to first user)
    let { data: user, error: userErr } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single();
    if (userErr) throw userErr;
    console.log('Using existing user:', user);
    const userId = user.id;

    // 2. Ensure wallet exists for the user
    const initialBalance = 1000; // INR
    let { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (walletErr && walletErr.code === 'PGRST404') {
      // Wallet not found, create it
      const insertRes = await supabase
        .from('wallets')
        .insert({ user_id: userId, main_balance: initialBalance })
        .single();
      if (insertRes.error) throw insertRes.error;
      wallet = insertRes.data;
      console.log('Created wallet:', wallet);
    } else if (walletErr) {
      throw walletErr;
    } else {
      console.log('Existing wallet:', wallet);
    }

    // 2. Admin login to get token
    const adminLoginRes = await fetch(`http://127.0.0.1:${process.env.PORT || 5000}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.ADMIN_EMAIL || 'adithyan3847@gmail.com', password: process.env.ADMIN_PASSWORD || 'TREESADHI2175@20' })
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.token;
    if (!adminToken) throw new Error('Admin login failed');
    console.log('Admin token obtained');

    // 3. Place a bet
    const betAmount = 100;
    const bet = {
      user_id: userId,
      amount: betAmount,
      selection: 'Red',
      game_type: 'FastParty',
      period: new Date().toISOString(),
      status: 'pending'
    };
    const { data: betRow, error: betErr } = await supabase
      .from('bets')
      .insert(bet)
      .select()
      .single();
    if (betErr) {
      console.error('Bet insert error:', betErr);
      throw betErr;
    }
    // Directly verify bet exists in DB
    const { data: betCheck, error: betCheckErr } = await supabase
      .from('bets')
      .select('*')
      .eq('id', betRow.id)
      .single();
    if (betCheckErr) throw betCheckErr;
    console.log('Direct DB bet fetch:', betCheck);
    console.log('Inserted bet:', betRow);

    // 4. Verify admin live bets endpoint
    const adminUrl = `http://127.0.0.1:${process.env.PORT || 5000}/api/admin/live-bets`;
    const response = await fetch(adminUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    });
    const json = await response.json();
    console.log('Admin live bets response status:', response.status);
    const betsArray = json.bets || [];
    console.log('Live bets returned count:', betsArray.length);
    const found = betsArray.find(b => b.id === betRow.id);
    console.log('Bet present in admin live bets:', !!found);
  } catch (e) {
    console.error('Error during verification:', e);
  }
})();
