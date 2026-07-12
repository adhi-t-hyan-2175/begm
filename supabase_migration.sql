-- ─── Supabase Database Migration ──────────────────────────────────────────────
-- Run these SQL statements in Supabase Dashboard → SQL Editor
-- in order, top to bottom.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add Google OAuth fields and Player ID to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

CREATE SEQUENCE IF NOT EXISTS player_id_seq START 7778;
ALTER TABLE users ADD COLUMN IF NOT EXISTS player_id BIGINT DEFAULT nextval('player_id_seq') UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by BIGINT REFERENCES users(player_id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_recharge_bonus_claimed BOOLEAN DEFAULT FALSE;

-- 1.5 Add bonus_balance to wallets
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS bonus_balance NUMERIC(12, 2) DEFAULT 0;

-- 1.6 Admin Settings Table
CREATE TABLE IF NOT EXISTS admin_settings (
  id INT PRIMARY KEY DEFAULT 1,
  referral_bonus_amount NUMERIC(12, 2) DEFAULT 100,
  min_recharge NUMERIC(12, 2) DEFAULT 100,
  max_recharge NUMERIC(12, 2) DEFAULT 50000,
  min_withdrawal NUMERIC(12, 2) DEFAULT 300,
  max_withdrawal NUMERIC(12, 2) DEFAULT 50000,
  admin_upi_id TEXT DEFAULT 'admin@upi',
  admin_upi_name TEXT DEFAULT 'Admin Name',
  support_email TEXT DEFAULT 'support@example.com',
  telegram_link TEXT DEFAULT 'https://t.me/example',
  maintenance_mode TEXT DEFAULT 'Off',
  first_recharge_bonus_percent NUMERIC(5, 2) DEFAULT 0
);

ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS admin_upi_name TEXT DEFAULT 'Admin Name';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS support_email TEXT DEFAULT 'support@example.com';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS telegram_link TEXT DEFAULT 'https://t.me/example';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS maintenance_mode TEXT DEFAULT 'Off';
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS first_recharge_bonus_percent NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE admin_settings ADD COLUMN IF NOT EXISTS forced_game_result TEXT;

INSERT INTO admin_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

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
  utr_number TEXT,
  sender_name TEXT,
  sender_upi TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recharge_requests ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE recharge_requests ADD COLUMN IF NOT EXISTS sender_upi TEXT;

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

-- 8. Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_created_at ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recharge_requests_status ON recharge_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

-- 11. Add ledger tracking columns to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS previous_balance NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS new_balance NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS admin_id BIGINT REFERENCES users(id);

-- 12. Create Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_name TEXT NOT NULL,
  player_id BIGINT,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_logs(created_at DESC);

-- 13. Atomic Ledger Function
CREATE OR REPLACE FUNCTION credit_wallet_and_log(
  p_user_id BIGINT,
  p_amount NUMERIC,
  p_type TEXT,
  p_notes TEXT,
  p_admin_id BIGINT DEFAULT NULL,
  p_razorpay_payment_id TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'Success'
)
RETURNS NUMERIC AS $$
DECLARE
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Get current balance and lock row
  SELECT main_balance INTO v_old_balance FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_old_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  v_new_balance := v_old_balance + p_amount;

  -- Update wallet
  UPDATE wallets
  SET 
    main_balance = v_new_balance,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert ledger transaction
  INSERT INTO transactions (
    user_id, amount, type, status, notes, previous_balance, new_balance, admin_id, razorpay_payment_id, created_at
  ) VALUES (
    p_user_id, p_amount, p_type, p_status, p_notes, v_old_balance, v_new_balance, p_admin_id, p_razorpay_payment_id, NOW()
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
