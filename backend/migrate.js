const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Treesadhi2175@db.gdnmdjvslznwdsjjcgwa.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  
  try {
    // Add round_id if missing (since error said it was missing)
    await client.query(`ALTER TABLE game_results ADD COLUMN IF NOT EXISTS round_id BIGINT;`);
    console.log('round_id added to game_results');

    // Add Phase 6 columns
    await client.query(`ALTER TABLE game_results ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;`);
    await client.query(`ALTER TABLE game_results ADD COLUMN IF NOT EXISTS result_source VARCHAR(50);`);
    console.log('locked_at and result_source added to game_results');
    
  } catch (err) {
    console.error('Error during migration:', err);
  } finally {
    await client.end();
  }
}

run();
