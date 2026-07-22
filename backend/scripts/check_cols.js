require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCols() {
  const { data, error } = await supabase.from('game_results').select('*').limit(1);
  if (error) {
    console.error("Error fetching game_results:", error);
  } else if (data.length > 0) {
    console.log("Columns:", Object.keys(data[0]));
  } else {
    // If no data, try inserting a dummy row and catch error to see columns? No, you can't easily see schema.
    console.log("No data in game_results. Let's try inserting a dummy to see if round_id exists.");
    const { error: insErr } = await supabase.from('game_results').insert([{ game: 'Test', period: '001', round_id: 123 }]);
    console.log("Insert error:", insErr);
  }
}
checkCols();
