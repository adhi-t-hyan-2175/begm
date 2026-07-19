require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const dbUrl = process.env.DATABASE_URL;

async function checkConnections() {
  if (!dbUrl) {
    console.error("DATABASE_URL not found in .env");
    return;
  }
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const res = await client.query(`
      SELECT pid, usename, application_name, client_addr, state, query 
      FROM pg_stat_activity 
      WHERE datname = 'postgres' AND client_addr IS NOT NULL;
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
checkConnections();
