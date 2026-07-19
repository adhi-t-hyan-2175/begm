-- BETX Final Fixes DB Migration
-- Run this script in the Supabase SQL Editor

-- 1. Add missing columns to recharge_requests
ALTER TABLE recharge_requests
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2. Add missing columns to withdrawal_requests
ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reject_reason TEXT,
ADD COLUMN IF NOT EXISTS fee_applied NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_amount NUMERIC DEFAULT 0;

-- 3. Enable Realtime for game_results
-- (Assuming Realtime is enabled for the database, we add the table to the publication)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'game_results'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.game_results;
  END IF;
END $$;
