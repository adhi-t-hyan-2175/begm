require('dotenv').config({ path: './.env' });
const supabase = require('../config/supabase');

async function checkAndFixPlatformSettings() {
  console.log('🔍 Checking platform_settings table...');

  try {
    // Fetch row 1 from platform_settings
    const { data, error } = await supabase.from('platform_settings').select('*').eq('id', 1).single();
    if (error) {
      console.error('Error fetching platform_settings:', error.message);
    } else {
      console.log('Current platform_settings row:', data);
    }

    // Attempt an upsert test
    const testData = {
      id: 1,
      min_recharge: data?.min_recharge || 100,
      max_recharge: data?.max_recharge || 50000,
      min_withdrawal: data?.min_withdrawal || 500,
      max_withdrawal: data?.max_withdrawal || 25000,
      referral_bonus: data?.referral_bonus || 50,
      registration_bonus: data?.registration_bonus || 300,
      upi_id: data?.upi_id || 'adhithyankbiju@naviaxix',
      admin_upi_name: 'ADHITHYAN K BIJU',
      telegram_link: data?.telegram_link || 'https://t.me/betxofficials',
      maintenance_mode: data?.maintenance_mode || 'Off',
      updated_at: new Date().toISOString()
    };

    const { error: upsertErr } = await supabase.from('platform_settings').upsert(testData);
    if (upsertErr) {
      console.error('❌ Upsert test failed:', upsertErr.message);
    } else {
      console.log('✅ Upsert test succeeded with upi_name!');
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

checkAndFixPlatformSettings();
