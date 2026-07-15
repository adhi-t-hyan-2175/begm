-- =============================================================
-- supabase_phase7_migration.sql
-- Phase 7 — Production Readiness & Bug Fixes
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================

-- ─── 1. deduct_wallet_balance RPC ────────────────────────────────────────────
-- Called by game.js placeBet. Atomically deducts bet amount and returns new balance.
-- Safe: checks balance before deducting; raises exception if insufficient.

CREATE OR REPLACE FUNCTION deduct_wallet_balance(
  p_user_id BIGINT,
  p_amount   NUMERIC
)
RETURNS NUMERIC AS $$
DECLARE
  v_current NUMERIC;
  v_new     NUMERIC;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT main_balance INTO v_current
    FROM wallets
   WHERE user_id = p_user_id
     FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  IF v_current < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_current, p_amount;
  END IF;

  v_new := v_current - p_amount;

  UPDATE wallets
     SET main_balance = v_new,
         updated_at   = NOW()
   WHERE user_id = p_user_id;

  RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ─── 2. Safe Phase 6 Schema Guards ───────────────────────────────────────────
-- Only applied if not already done. Uses DO $$ to guard against RENAME errors.

DO $$
BEGIN
  -- Rename admin_audit_logs.admin_name → admin_email (only if needed)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'admin_audit_logs' AND column_name = 'admin_name'
  ) THEN
    ALTER TABLE admin_audit_logs RENAME COLUMN admin_name TO admin_email;
  END IF;

  -- Rename admin_audit_logs.player_id → target_user (only if needed)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'admin_audit_logs' AND column_name = 'player_id'
  ) THEN
    ALTER TABLE admin_audit_logs RENAME COLUMN player_id TO target_user;
  END IF;
END $$;

-- Ensure new columns exist (safe IF NOT EXISTS)
ALTER TABLE admin_audit_logs ALTER COLUMN target_user TYPE TEXT USING target_user::TEXT;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS ip     TEXT;
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS device TEXT;

-- System Logs table (no-op if already exists)
CREATE TABLE IF NOT EXISTS system_logs (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  type          TEXT        NOT NULL,
  error_message TEXT        NOT NULL,
  stack_trace   TEXT,
  resolved      BOOLEAN     DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Admin Sessions table (no-op if already exists)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email      TEXT        NOT NULL,
  ip               TEXT,
  browser          TEXT,
  last_action      TEXT,
  login_time       TIMESTAMPTZ DEFAULT NOW(),
  last_active_time TIMESTAMPTZ DEFAULT NOW()
);

-- Device fingerprint column on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS device_info TEXT;

-- ─── 3. Performance Indexes ───────────────────────────────────────────────────
-- Speeds up the most frequent admin dashboard queries.

CREATE INDEX IF NOT EXISTS idx_bets_game_period      ON bets(game_type, period);
CREATE INDEX IF NOT EXISTS idx_bets_user_status      ON bets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bets_created_at       ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user     ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recharge_status       ON recharge_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status     ON withdrawal_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_created_at      ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_resolved  ON system_logs(resolved, created_at DESC);

-- ─── 4. Wallet balance non-negative constraint ────────────────────────────────
-- Prevents any direct UPDATE that would set main_balance below zero.
ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_balance_non_negative;
ALTER TABLE wallets ADD CONSTRAINT wallets_balance_non_negative
  CHECK (main_balance >= 0);

-- ─── 5. Unique UTR constraint ─────────────────────────────────────────────────
-- Prevents two recharge requests with the same UTR number from different users.
-- If you have existing duplicate UTRs, comment this block out and run the fraud
-- report first to clean them up.
-- ALTER TABLE recharge_requests DROP CONSTRAINT IF EXISTS unique_utr_per_request;
-- ALTER TABLE recharge_requests ADD CONSTRAINT unique_utr_per_request UNIQUE (utr_number);

-- Done.
SELECT 'Phase 7 migration complete' AS status;
