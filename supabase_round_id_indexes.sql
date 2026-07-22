-- Add indexes for round_id to support fast lookups
CREATE INDEX IF NOT EXISTS idx_bets_game_round_id ON bets(game_type, round_id);
CREATE INDEX IF NOT EXISTS idx_game_results_game_round_id ON game_results(game, round_id);
CREATE INDEX IF NOT EXISTS idx_global_game_state_game_round_id ON global_game_state(game, round_id);
