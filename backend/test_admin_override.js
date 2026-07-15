const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gdnmdjvslznwdsjjcgwa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'dummy_key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runTest() {
  console.log('🧪 Starting Admin Override Integration Test...');

  // 1. Create or fetch two test users
  const testUsers = ['testuser1@gambb.com', 'testuser2@gambb.com'];
  const userIds = [];

  for (const email of testUsers) {
    let { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    
    if (!user) {
      console.log(`Creating test user: ${email}`);
      const { data: newUser, error } = await supabase.from('users').insert({
        email,
        nickname: email.split('@')[0],
        role: 'user',
        status: 'Active',
        total_recharge: 5000,
        vip_level: 'Bronze'
      }).select().single();
      if (error) throw error;
      user = newUser;

      // Create wallet
      await supabase.from('wallets').insert({
        user_id: user.id,
        main_balance: 1000,
        bonus_balance: 0
      });
    } else {
      // Ensure they have balance
      await supabase.from('wallets').update({ main_balance: 1000 }).eq('user_id', user.id);
    }
    userIds.push(user.id);
  }
  
  console.log('✅ Test users ready. Balances reset to 1000.');

  // 2. Get the current active period for FastParty
  const { data: gameState } = await supabase.from('global_game_state').select('*').eq('game', 'FastParty').single();
  
  if (!gameState || gameState.status !== 'betting') {
    console.log('⏳ Waiting for FastParty to enter betting phase...');
    let isBetting = false;
    while (!isBetting) {
      await delay(2000);
      const { data: check } = await supabase.from('global_game_state').select('*').eq('game', 'FastParty').single();
      if (check && check.status === 'betting') {
        isBetting = true;
        gameState.period = check.period;
      }
    }
  }

  const period = gameState.period;
  console.log(`✅ Current Active FastParty Period: ${period}`);

  // 3. Place bets for both users on 'Violet'
  console.log('🎲 Placing bets of ₹100 on Violet for both users...');
  
  for (let i = 0; i < 2; i++) {
    const { error: betErr } = await supabase.from('bets').insert({
      user_id: userIds[i],
      game_type: 'FastParty',
      period: period,
      selection: 'Violet',
      amount: 100,
      wallet_before: 1000,
      wallet_after: 900,
      status: 'pending'
    });
    if (betErr) throw betErr;
    
    // Deduct from wallet
    await supabase.from('wallets').update({ main_balance: 900 }).eq('user_id', userIds[i]);
  }
  
  console.log('✅ Bets placed successfully.');

  // 4. Admin overrides the result to 'Violet'
  console.log('🛠️ Admin overrides outcome to Violet...');
  await supabase.from('global_game_state').update({
    admin_override: JSON.stringify({ label: 'Violet' })
  }).eq('game', 'FastParty');

  console.log('✅ Override set.');

  // 5. Wait for the game engine to resolve the period
  console.log(`⏳ Waiting for backend Game Engine to resolve period ${period}...`);
  let resolved = false;
  let finalResultData = null;
  
  while (!resolved) {
    await delay(2000);
    const { data: resData } = await supabase.from('game_results').select('*').eq('game', 'FastParty').eq('period', period).maybeSingle();
    if (resData) {
      resolved = true;
      finalResultData = resData;
    }
  }

  console.log('🎉 Period resolved by Game Engine!');
  console.log('Result Object:', finalResultData.result);

  // Verify the colors were merged properly (which I just fixed!)
  if (finalResultData.result.label === 'Violet' && finalResultData.result.color.includes('#6f42c1')) {
    console.log('✅ Admin Override correctly merged colors/numbers!');
  } else {
    console.log('❌ Override failed to merge properly!', finalResultData.result);
  }

  // 6. Check if both users won
  console.log('💰 Verifying bet payouts...');
  const { data: settledBets } = await supabase.from('bets').select('*').eq('game_type', 'FastParty').eq('period', period).in('user_id', userIds);
  
  let bothWon = true;
  for (const bet of settledBets) {
    if (bet.status === 'won') {
      console.log(`✅ User ${bet.user_id} won! Payout calculated successfully.`);
    } else {
      console.log(`❌ User ${bet.user_id} bet status is: ${bet.status}`);
      bothWon = false;
    }
  }

  // Check wallets
  const { data: w1 } = await supabase.from('wallets').select('*').eq('user_id', userIds[0]).single();
  const { data: w2 } = await supabase.from('wallets').select('*').eq('user_id', userIds[1]).single();
  
  console.log(`User 1 Balance: ₹${w1.main_balance} (Expected ~1350 for Violet 4.5x multiplier)`);
  console.log(`User 2 Balance: ₹${w2.main_balance} (Expected ~1350)`);

  if (bothWon && w1.main_balance > 1000) {
    console.log('🚀 TEST PASSED: Admin selection triggers wins for all matched users seamlessly!');
  } else {
    console.log('⚠️ TEST FAILED: Payouts or wins did not process correctly.');
  }
}

runTest().catch(err => console.error('Test Error:', err));
