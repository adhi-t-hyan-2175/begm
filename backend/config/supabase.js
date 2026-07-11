const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT_REF')) {
  console.warn('[Supabase] ⚠️  Not configured. Add SUPABASE_URL and SUPABASE_SERVICE_KEY to backend/.env');
}

// Service-role client — bypasses Row Level Security for admin operations
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder',
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);

module.exports = supabase;
