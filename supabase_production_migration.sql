-- ─── Supabase Database Production Migration ─────────────────────────────────────
-- Run these SQL statements in Supabase Dashboard → SQL Editor
-- This script is safe to run on existing databases (uses IF NOT EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Update Bets Table with History Requirements
ALTER TABLE bets ADD COLUMN IF NOT EXISTS odds NUMERIC(10, 2) DEFAULT 1.96;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS wallet_before NUMERIC(12, 2);
ALTER TABLE bets ADD COLUMN IF NOT EXISTS wallet_after NUMERIC(12, 2);
ALTER TABLE bets ADD COLUMN IF NOT EXISTS profit NUMERIC(12, 2);

-- 2. Prevent Duplicate Recharges (assuming UTR should be unique)
-- Create UTR column if it doesn't exist
ALTER TABLE recharge_requests ADD COLUMN IF NOT EXISTS utr_number TEXT;

-- Note: If multiple recharges can have the same UTR (unlikely), remove this constraint.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_utr_number') THEN
    ALTER TABLE recharge_requests ADD CONSTRAINT unique_utr_number UNIQUE (utr_number);
  END IF;
END $$;

-- 3. Daily Rankings Table (For 9 PM - 12 AM display)
CREATE TABLE IF NOT EXISTS daily_rankings (
  id SERIAL PRIMARY KEY,
  rank_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  highest_winner_id BIGINT REFERENCES users(id),
  highest_winner_amount NUMERIC(12, 2) DEFAULT 0,
  highest_bettor_id BIGINT REFERENCES users(id),
  highest_bettor_amount NUMERIC(12, 2) DEFAULT 0,
  highest_recharge_id BIGINT REFERENCES users(id),
  highest_recharge_amount NUMERIC(12, 2) DEFAULT 0,
  top_profit_id BIGINT REFERENCES users(id),
  top_profit_amount NUMERIC(12, 2) DEFAULT 0,
  top_20_players JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_rankings_date ON daily_rankings(rank_date);

-- 4. Ensure Admin Settings have all fields
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

-- 5. Atomic decrement function for placing bets securely
CREATE OR REPLACE FUNCTION deduct_wallet_balance(
  p_user_id BIGINT,
  p_amount NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  -- We use an atomic update and ensure balance doesn't drop below 0
  UPDATE wallets
  SET 
    main_balance = main_balance - p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id AND main_balance >= p_amount
  RETURNING main_balance INTO v_new_balance;

  -- If the update didn't happen (insufficient funds or user not found), return NULL
  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for updating updated_at timestamp on daily_rankings
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_daily_rankings_updated_at') THEN
    CREATE TRIGGER set_daily_rankings_updated_at
    BEFORE UPDATE ON daily_rankings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
