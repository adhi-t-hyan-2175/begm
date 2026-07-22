-- Phase 6 Migration: Add result_source and locked_at to game_results

ALTER TABLE game_results ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE game_results ADD COLUMN IF NOT EXISTS result_source VARCHAR(50);

-- Migrate existing data
UPDATE game_results SET result_source = 'Admin', locked_at = created_at WHERE is_override = true AND result_source IS NULL;
UPDATE game_results SET result_source = 'AI', locked_at = created_at WHERE is_override = false AND result_source IS NULL;
