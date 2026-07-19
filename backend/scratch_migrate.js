const fs = require('fs');
const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Treesadhi2175@db.gdnmdjvslznwdsjjcgwa.supabase.co:5432/postgres';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  
  const sql = fs.readFileSync('../supabase_production_migration.sql', 'utf8');
  console.log('Running migration...');
  await client.query(sql);
  console.log('Migration done.');
  
  console.log('Reloading schema cache...');
  await client.query("NOTIFY pgrst, 'reload schema';");
  console.log('Schema cache reloaded.');
  
  await client.end();
}

run().catch(e => { console.error(e); process.exit(1); });
