import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('YOUR_PROJECT_REF')) {
  console.warn(
    '⚠️  Supabase not configured yet. Open frontend/.env and fill in your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n' +
    '   The app is running in offline/localStorage mode until then.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,       // Let Supabase manage the Google OAuth session
      autoRefreshToken: true,     // Auto-refresh tokens before they expire
      detectSessionInUrl: true,   // Pick up the OAuth callback hash from the URL
    },
    global: { headers: { 'x-app-name': 'gambb-platform' } },
  }
);

// Helper — returns true if Supabase is properly configured
export const isSupabaseReady = () =>
  !!supabaseUrl && !supabaseUrl.includes('YOUR_PROJECT_REF');

// ─── Generic helpers ──────────────────────────────────────────────────────────

/**
 * Fetch a single row by a column value.
 * Example: getBy('users', 'phone', '+91...')
 */
export async function getBy(table, column, value) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq(column, value)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
  return data;
}

/**
 * Insert a row and return the inserted record.
 */
export async function insertRow(table, payload) {
  const { data, error } = await supabase
    .from(table)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update rows matching a column value.
 */
export async function updateWhere(table, matchColumn, matchValue, updates) {
  const { data, error } = await supabase
    .from(table)
    .update(updates)
    .eq(matchColumn, matchValue)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch all rows from a table, optionally filtered.
 * filter: { column, value }
 */
export async function getAll(table, filter = null, orderBy = null) {
  let query = supabase.from(table).select('*');
  if (filter) query = query.eq(filter.column, filter.value);
  if (orderBy) query = query.order(orderBy, { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
