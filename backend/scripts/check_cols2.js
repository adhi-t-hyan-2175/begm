require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCols() {
  const tables = ['global_game_state', 'bets', 'users'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error fetching ${table}:`, error);
    } else if (data && data.length > 0) {
      console.log(`Columns for ${table}:`, Object.keys(data[0]));
    } else {
      console.log(`No data in ${table}, inserting dummy`);
      const { error: insErr } = await supabase.from(table).insert([{}]);
      console.log(`${table} Insert error:`, insErr);
    }
  }
}
checkCols();
