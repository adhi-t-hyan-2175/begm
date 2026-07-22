require('dotenv').config({ path: './.env' });
const supabase = require('../config/supabase');

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
    const now = new Date().toISOString();

    for (const game of games) {
      await supabase.from('global_game_state').upsert({
        game,
        period: '001',
        round_id: 1000000,
        status: 'betting',
        admin_override: null,
        updated_at: now
      }, { onConflict: 'game' });
    }

    console.log('✅ Successfully reset global_game_state to period 001 for all games!');
  } catch (err) {
    console.error('❌ Error resetting game history:', err);
  }
}

resetGameHistory();
