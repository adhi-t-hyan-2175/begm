const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gdnmdjvslznwdsjjcgwa.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'dummy_key';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkBets() {
  const { data: bets } = await supabase.from('bets')
    .select('*, users(email)')
    .order('created_at', { ascending: false })
    .limit(10);
    
  console.log("Last 10 Bets:");
  bets.forEach(b => {
    console.log(`[${b.game_type} Per:${b.period}] User:${b.users?.email} | Bet:${b.selection} | Amt:${b.amount} | Res:${b.result} | Status:${b.status} | Payout:${b.payout}`);
  });
}
checkBets().catch(console.error);
