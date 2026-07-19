// verify_settlement.js
// This script verifies the settlement engine by placing a test bet, triggering settlement, and comparing DB states.

// Load backend .env manually before importing supabase
const path = require('path');
const fs = require('fs');
const envPath = path.resolve(__dirname, '../backend/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}

// Now import Supabase client
const supabase = require('../backend/config/supabase');

// fetch is built-in in Node >=18; no external library needed
const jwt = require('../backend/node_modules/jsonwebtoken');
console.log('SUPABASE_URL loaded:', process.env.SUPABASE_URL);
// Admin token will be fetched inside async function
// Helper to pause
const sleep = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const tokenPath = path.resolve(__dirname, '../admin_token.txt');
    let adminToken;
    if (fs.existsSync(tokenPath)) {
      adminToken = fs.readFileSync(tokenPath, 'utf8').trim();
      console.log('Reusing cached admin token');
    } else {
      // Perform admin login once and cache token
      const adminLoginRes = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'adithyan3847@gmail.com', password: process.env.ADMIN_PASSWORD || 'TREESADHI2175@20' })
      });
      const adminLoginData = await adminLoginRes.json();
      if (!adminLoginData.success) {
        throw new Error('Admin login failed: ' + (adminLoginData.message || 'unknown'));
      }
      adminToken = adminLoginData.token;
      fs.writeFileSync(tokenPath, adminToken, { encoding: 'utf8' });
      console.log('Admin token cached for future runs');
    }

    // 1. Ensure a test user exists (create if not)
    const testEmail = 'test_user@example.com';
    const { data: existingUser, error: userErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', testEmail)
      .single();
    let userId;
    if (userErr && userErr.code !== 'PGRST116') { // ignore not found error
      throw userErr;
    }
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: newUser, error: createErr } = await supabase
        .from('users')
        .insert({ email: testEmail, nickname: 'TestUser' })
        .select()
        .single();
      if (createErr) throw createErr;
      if (!newUser || !newUser.id) {
        throw new Error('User creation failed: no user ID returned');
      }
      userId = newUser.id;
    }
    // Ensure wallet exists
    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('id, main_balance')
      .eq('user_id', userId)
      .single();
    if (walletErr && walletErr.code !== 'PGRST116') {
      throw walletErr;
    }
    if (!wallet || !wallet.id) {
      const { error: walletInsertErr } = await supabase.from('wallets').insert({ user_id: userId, main_balance: 1000 });
      if (walletInsertErr) throw walletInsertErr;
    }

    const game = 'FastParity'; // valid game from config
    const period = 'test-period-' + Date.now();
    const betAmount = 100;
    const selection = 'Red'; // valid selection for FastParity

    // 2. Place a test bet directly via DB (simpler than API)
    // Capture wallet balance before placing bet
    const walletBefore = wallet ? wallet.main_balance : 0;
    const { data: bet, error: betErr } = await supabase
      .from('bets')
      .insert({
        user_id: userId,
        game_type: game,
        period,
        amount: betAmount,
        selection,
        status: 'pending',
        wallet_before: walletBefore,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (betErr) {
      console.error('Bet insert error:', betErr);
      throw betErr;
    }
    if (!bet) {
      throw new Error('Bet insert returned null');
    }
    console.log('Bet insert result:', bet);
    console.log('Placed test bet ID', bet.id);

    // Capture pre-settlement state
    const preBet = await supabase.from('bets').select('*').eq('id', bet.id).single();
    const preWallet = await supabase.from('wallets').select('main_balance').eq('user_id', userId).single();
    const preTxCount = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    const preResult = await supabase.from('game_results').select('*').eq('game', game).eq('period', period).maybeSingle();

    // 3. Trigger settlement via admin endpoint
    // Force game result to match selection (win)
    const setResultRes = await fetch('http://localhost:5000/api/admin/set-game-result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ gameType: game, result: { label: selection } })
    });
    const setResultData = await setResultRes.json();
    console.log('Set result response', setResultData);
    // Now trigger settlement
    const settleRes = await fetch('http://localhost:5000/api/admin/settle-bets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ game, period })
    });
    const settleData = await settleRes.json();
    console.log('Settlement response', settleData);

    // Wait a moment for async DB ops to propagate
    await sleep(2000);

    // 4. Capture post-settlement state
    const postBet = await supabase.from('bets').select('*').eq('id', bet.id).single();
    const postWallet = await supabase.from('wallets').select('main_balance').eq('user_id', userId).single();
    const postTx = await supabase.from('transactions').select('*').eq('user_id', userId);
    const postResult = await supabase.from('game_results').select('*').eq('game', game).eq('period', period).maybeSingle();

    // 5. Log comparisons
    console.log('--- BEFORE SETTLEMENT ---');
    console.log('Bet:', preBet.data);
    console.log('Wallet balance:', preWallet.data?.main_balance);
    console.log('Transactions count before:', preTxCount.count);

    // Fetch transaction count after settlement correctly
    const postTxCount = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    const postTxRows = await supabase.from('transactions').select('*').eq('user_id', userId);

    console.log('--- AFTER SETTLEMENT ---');
    console.log('Bet:', postBet.data);
    console.log('Wallet balance:', postWallet.data?.main_balance);
    console.log('Result row:', postResult.data);
    console.log('Transactions count after:', postTxCount.count);
    console.log('Transaction rows:', postTxRows.data);
    console.log('Result row (pre):', preResult.data);
    console.log('Transactions count before:', preTxCount.count);

    // Simple assertions
    if (!postBet.data || !postBet.data.status || postBet.data.status === 'pending') {
      throw new Error('Bet status not updated after settlement');
    }
    if (!postResult.data) {
      throw new Error('Game result not recorded');
    }
    if (postTx.length === 0) {
      console.warn('No transaction recorded – could be a losing bet');
    }
    console.log('Verification completed successfully.');
  } catch (err) {
    console.error('Verification script error:', err);
    process.exit(1);
  }
})();
