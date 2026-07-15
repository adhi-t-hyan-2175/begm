const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gdnmdjvslznwdsjjcgwa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'dummy_key';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runTest() {
  const user1 = 'testuser1@gambb.com';
  const { data: user } = await supabase.from('users').select('id').eq('email', user1).single();
  const userId = user.id;

  const { data: gameState } = await supabase.from('global_game_state').select('*').eq('game', 'Wheelocity').single();
  let period = gameState.period;
  if (gameState.status !== 'betting') {
    console.log('Waiting for Wheelocity betting phase...');
    while (true) {
      await delay(2000);
      const { data: check } = await supabase.from('global_game_state').select('*').eq('game', 'Wheelocity').single();
      if (check && check.status === 'betting') {
        period = check.period;
        break;
      }
    }
  }

  console.log(`Placing bet on '5 Hits' for period ${period}...`);
  await supabase.from('bets').insert({
    user_id: userId, game_type: 'Wheelocity', period: period, selection: '5 Hits',
    amount: 100, wallet_before: 1000, wallet_after: 900, status: 'pending'
  });

  console.log('Setting Admin Override to "5 Hits"...');
  await supabase.from('global_game_state').update({
    admin_override: JSON.stringify({ label: '5 Hits' })
  }).eq('game', 'Wheelocity');

  console.log(`Waiting for resolution of period ${period}...`);
  while (true) {
    await delay(2000);
    const { data: resData } = await supabase.from('game_results').select('*').eq('game', 'Wheelocity').eq('period', period).maybeSingle();
    if (resData) {
      console.log('Result:', resData.result);
      break;
    }
  }

  const { data: betData } = await supabase.from('bets').select('*').eq('game_type', 'Wheelocity').eq('period', period).eq('user_id', userId).single();
  console.log('Bet status:', betData.status, '| Payout:', betData.payout);
}

runTest().catch(console.error);
