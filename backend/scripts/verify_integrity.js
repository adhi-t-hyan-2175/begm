require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in backend/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIntegrity() {
  console.log('--- Database Integrity Check ---');
  let errors = 0;

  // 1. Check for duplicate game_results
  const { data: results, error: resErr } = await supabase.from('game_results').select('game, round_id, id');
  if (resErr) {
    console.error('Failed to fetch game_results:', resErr);
    return;
  }
  
  const resultCounts = {};
  results.forEach(r => {
    const key = `${r.game}_${r.round_id}`;
    if (!resultCounts[key]) resultCounts[key] = [];
    resultCounts[key].push(r.id);
  });

  const dupes = Object.keys(resultCounts).filter(k => resultCounts[k].length > 1);
  if (dupes.length > 0) {
    console.error(`❌ Found ${dupes.length} rounds with DUPLICATE results!`);
    dupes.forEach(d => console.error(`  - ${d}: IDs [${resultCounts[d].join(', ')}]`));
    errors++;
  } else {
    console.log('✅ No duplicate game_results.');
  }

  // 2. Check for orphan pending bets (bets for rounds that have a result but are still 'Pending')
  const { data: pendingBets, error: betErr } = await supabase.from('bets').select('id, game_type, round_id, status').eq('status', 'Pending');
  
  let orphanCount = 0;
  if (pendingBets) {
    pendingBets.forEach(bet => {
      const key = `${bet.game_type}_${bet.round_id}`;
      if (resultCounts[key]) {
        console.error(`❌ Found Orphan Bet! Bet ${bet.id} is Pending but Round ${key} has ended.`);
        orphanCount++;
        errors++;
      }
    });
  }
  if (orphanCount === 0) {
    console.log('✅ No orphan pending bets for ended rounds.');
  }

  // 3. Check for multiple settlements per bet
  // When a bet is settled, a transaction is created. Let's check for multiple 'win' transactions for the same bet.
  const { data: txns, error: txnErr } = await supabase.from('transactions').select('description, id, user_id').ilike('description', '%won%');
  if (txns) {
    const txnMap = {};
    txns.forEach(tx => {
      // description usually contains "Won FastParity round 123" 
      if (tx.description) {
        if (!txnMap[tx.description]) txnMap[tx.description] = 0;
        txnMap[tx.description]++;
      }
    });
    const dupTxns = Object.keys(txnMap).filter(k => txnMap[k] > 1);
    if (dupTxns.length > 0) {
      console.warn(`⚠️ Potential duplicate transactions found (Note: may be normal if multiple bets had same description).`);
      // dupTxns.forEach(d => console.warn(`  - ${d}: ${txnMap[d]} times`));
      // Not marking as strict error without bet_id linkage, but logging it.
    } else {
      console.log('✅ No duplicate winning transaction descriptions.');
    }
  }

  if (errors === 0) {
    console.log('\n🌟 INTEGRITY CHECK PASSED! No critical issues found.');
  } else {
    console.log(`\n💥 INTEGRITY CHECK FAILED! Found ${errors} issues.`);
  }
}

checkIntegrity();
