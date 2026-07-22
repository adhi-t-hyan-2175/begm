-- ==========================================================
-- FINAL PRODUCTION DATABASE MIGRATION SQL (Phases 2-6)
-- ==========================================================

-- ----------------------------------------------------------
-- 1. ADD MISSING COLUMNS (Idempotent)
-- ----------------------------------------------------------

-- Add round_id to global_game_state
ALTER TABLE global_game_state ADD COLUMN IF NOT EXISTS round_id BIGINT;

-- Add round_id, locked_at, result_source to game_results
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS round_id BIGINT;
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS result_source VARCHAR(50);

-- Add round_id to bets
ALTER TABLE bets ADD COLUMN IF NOT EXISTS round_id BIGINT;


-- ----------------------------------------------------------
-- 2. SAFE HISTORICAL DATA MIGRATION
-- ----------------------------------------------------------
-- STRATEGY:
-- Because the legacy 'period' wraps around (001-999), multiple historical 
-- rows exist with the exact same 'period'. Setting round_id = period::BIGINT 
-- would cause catastrophic collisions and violate unique constraints.
--
-- Since gameEngine.js generates new round_ids starting at 1,000,000 
-- (elapsedPeriods + 1000000), we can safely assign sequential IDs starting 
-- from 1 for all historical data without ever colliding with new rounds.

-- Initialize global_game_state.round_id safely
UPDATE global_game_state 
SET round_id = 1 
WHERE round_id IS NULL;

-- Initialize game_results using sequential ROW_NUMBER
WITH numbered_results AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY game ORDER BY created_at ASC) AS seq
  FROM game_results
  WHERE round_id IS NULL
)
UPDATE game_results
SET round_id = nr.seq
FROM numbered_results nr
WHERE game_results.id = nr.id;

-- Initialize Phase 6 columns based on legacy is_override flag
UPDATE game_results 
SET result_source = 'Admin', locked_at = created_at 
WHERE is_override = true AND result_source IS NULL;

UPDATE game_results 
SET result_source = 'AI', locked_at = created_at 
WHERE is_override = false AND result_source IS NULL;

-- Initialize bets using sequential ROW_NUMBER
-- Note: Historical bets are already settled (Won/Lost). Their round_ids don't 
-- strictly need to perfectly match game_results for future engine logic, 
-- they just need to be populated and avoid collisions with live active rounds.
WITH numbered_bets AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY game_type ORDER BY created_at ASC) AS seq
  FROM bets
  WHERE round_id IS NULL
)
UPDATE bets
SET round_id = nb.seq
FROM numbered_bets nb
WHERE bets.id = nb.id;


-- ----------------------------------------------------------
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ----------------------------------------------------------

-- Index for global_game_state queries (game, round_id)
CREATE INDEX IF NOT EXISTS idx_global_game_state_game_round 
ON global_game_state(game, round_id);

-- Index for game_results lookups (game, round_id)
CREATE INDEX IF NOT EXISTS idx_game_results_game_round 
ON game_results(game, round_id);

-- Index for fast settlement queries in bets table
CREATE INDEX IF NOT EXISTS idx_bets_game_round 
ON bets(game_type, round_id);

-- Index for active bets lookup (status = 'Pending')
CREATE INDEX IF NOT EXISTS idx_bets_status 
ON bets(status);

-- ----------------------------------------------------------
-- END OF MIGRATION
-- ==========================================================
