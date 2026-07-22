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
-- 2. SAFE DATA MIGRATION (Initialize missing values)
-- ----------------------------------------------------------

-- Initialize global_game_state.round_id to 1 if null
UPDATE global_game_state 
SET round_id = 1 
WHERE round_id IS NULL;

-- Initialize game_results.round_id to period (cast to BIGINT) if null
-- Assuming period is numeric-like (e.g., '001' or '20231010001'). If parsing fails, default to 1.
UPDATE game_results 
SET round_id = NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::BIGINT 
WHERE round_id IS NULL AND period ~ '^[0-9]+$';

UPDATE game_results 
SET round_id = 1 
WHERE round_id IS NULL;

-- Initialize game_results Phase 6 columns based on legacy is_override flag
UPDATE game_results 
SET result_source = 'Admin', locked_at = created_at 
WHERE is_override = true AND result_source IS NULL;

UPDATE game_results 
SET result_source = 'AI', locked_at = created_at 
WHERE is_override = false AND result_source IS NULL;

-- Initialize bets.round_id to period if null
UPDATE bets 
SET round_id = NULLIF(regexp_replace(period, '[^0-9]', '', 'g'), '')::BIGINT 
WHERE round_id IS NULL AND period ~ '^[0-9]+$';

UPDATE bets 
SET round_id = 1 
WHERE round_id IS NULL;


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
