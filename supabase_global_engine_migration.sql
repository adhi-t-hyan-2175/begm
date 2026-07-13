-- 1. Create the global_game_state table
CREATE TABLE IF NOT EXISTS global_game_state (
  game TEXT PRIMARY KEY,
  period TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('betting', 'resolving')),
  admin_override JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Supabase Realtime for this table
-- This allows the frontend to listen to changes instantly.
ALTER PUBLICATION supabase_realtime ADD TABLE global_game_state;
