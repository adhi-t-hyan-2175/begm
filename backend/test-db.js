require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
async function test() {
  const { data, error } = await supabase.from('recharge_requests').select('*');
  console.log('Recharge Requests:', data, error);
}
test();
