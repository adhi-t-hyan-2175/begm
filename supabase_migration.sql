-- ─── Supabase Database Migration ──────────────────────────────────────────────
-- Run these SQL statements in Supabase Dashboard → SQL Editor
-- in order, top to bottom.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add Google OAuth fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;

-- 2. Add idempotency field to transactions (prevents Razorpay replay attacks)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT UNIQUE;

-- 3. Bets table (game history)
CREATE TABLE IF NOT EXISTS bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  period TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  selection TEXT NOT NULL,
  result TEXT,
  payout NUMERIC(12, 2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Ensure recharge_requests table has the right columns
CREATE TABLE IF NOT EXISTS recharge_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Ensure withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  upi_id TEXT NOT NULL,
  upi_name TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- 8. ADMIN BOOTSTRAP — Change the email to YOUR Google email before running
-- This makes the first Google OAuth login with this email get admin role.
-- After running this, your next Google login will automatically have admin access.
UPDATE users SET role = 'admin' WHERE email = 'adithyan3847@gmail.com';
-- If no row is updated, it means you haven't logged in yet with Google.
-- That's fine — the backend ADMIN_EMAIL env var handles this automatically on first login.

-- 9. Row Level Security (optional but recommended for production)
-- Enable RLS on sensitive tables
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own wallet
DROP POLICY IF EXISTS "Users see own wallet" ON wallets;

CREATE POLICY "Users see own wallet"
ON wallets
FOR SELECT
USING (auth.uid()::TEXT = user_id::TEXT);

-- Allow backend service role to bypass RLS (already true for service_role key)

-- 10. ATOMIC WALLET OPERATIONS (RPC) — prevents race conditions and duplicate credits
CREATE OR REPLACE FUNCTION increment_wallet_balance(
  p_user_id BIGINT,
  p_amount NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  UPDATE wallets
  SET 
    main_balance = main_balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING main_balance INTO v_new_balance;

  -- If wallet didn't exist, this returns NULL. We could optionally insert here if needed.
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

