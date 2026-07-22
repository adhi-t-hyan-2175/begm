require('dotenv').config({ path: './.env' });
const supabase = require('../config/supabase');

const deterministicRandom = (seed) => {
  let h = 0xdeadbeef;
  for(let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

const generateBaseResult = (gameType, round_id) => {
  const rnd = deterministicRandom(gameType + round_id);
  let result = {};
  
  if (gameType === 'FastParity' || gameType === 'Parity' || gameType === 'Sapre') {
    const choices = ['Red', 'Green', 'Violet'];
    const selected = choices[Math.floor(rnd * choices.length)];
    result.label = selected;
    if (selected === 'Red') { result.color = ['#dc3545']; result.number = 2; }
    if (selected === 'Green') { result.color = ['#28a745']; result.number = 5; }
    if (selected === 'Violet') { result.color = ['#6f42c1']; result.number = 0; }
  } else if (gameType === 'Wheelocity') {
    const choices = ['2 Hits', '3 Hits', '5 Hits'];
    const selected = choices[Math.floor(rnd * choices.length)];
    result.label = selected;
    if (selected === '2 Hits') result.color = ['#0ea5e9'];
    if (selected === '3 Hits') result.color = ['#ff8cec'];
    if (selected === '5 Hits') result.color = ['#88f29f'];
  } else if (gameType === 'Dice') {
    const sum = (Math.floor(rnd * 6) + 1) + (Math.floor(deterministicRandom(gameType + round_id + '-2') * 6) + 1);
    result.number = sum;
    if (sum === 7) { result.label = 'Tie'; result.color = ['#f1c40f']; }
    else if (sum >= 2 && sum <= 6) { result.label = 'Small'; result.color = ['#0ea5e9']; }
    else { result.label = 'Large'; result.color = ['#dc3545']; }
  } else {
    result = { label: 'Green', color: ['#28a745'], number: 1 };
  }
  return result;
};

async function resetGameHistory() {
  console.log('🔄 Starting Game History and Period Reset to 001...');

  try {
    // 1. Delete legacy unaligned history records
    const { error: deleteErr } = await supabase.from('game_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteErr) {
      console.warn('Warning clearing game_results:', deleteErr.message);
    } else {
      console.log('✅ Cleared all legacy game_results');
    }

    // 2. Reset global_game_state to period 001
    const games = ['FastParity', 'Parity', 'Sapre', 'Dice', 'Wheelocity', 'AndarBahar'];
    const now = new Date();

    for (const game of games) {
      await supabase.from('global_game_state').upsert({
        game,
        period: '001',
        round_id: 1000000,
        status: 'betting',
        admin_override: null,
        updated_at: now.toISOString()
      }, { onConflict: 'game' });
    }

    // 3. Seed initial records for periods 001 to 010 so game record strips display immediately
    const initialRecords = [];
    games.forEach(game => {
      for (let i = 1; i <= 10; i++) {
        const periodStr = i.toString().padStart(3, '0');
        const round_id = 999990 + i;
        const res = generateBaseResult(game, round_id);
        const createdAt = new Date(now.getTime() - (11 - i) * 60000).toISOString();
        initialRecords.push({
          game,
          period: periodStr,
          round_id,
          result: res,
          is_override: false,
          result_source: 'AI',
          profit: 0,
          total_bets: 0,
          created_at: createdAt
        });
      }
    });

    const { error: insertErr } = await supabase.from('game_results').insert(initialRecords);
    if (insertErr) {
      console.warn('Warning inserting initial seed records:', insertErr.message);
    } else {
      console.log('✅ Seeded initial history records (001 to 010) for all games!');
    }

    console.log('✅ Successfully reset global_game_state and seeded history for all games!');
  } catch (err) {
    console.error('❌ Error resetting game history:', err);
  }
}

resetGameHistory();
