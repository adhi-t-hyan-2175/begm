-- Drop old policies first (safe even if they don't exist)
DROP POLICY IF EXISTS "allow_anon_read_game_state" ON public.global_game_state;
DROP POLICY IF EXISTS "allow_anon_read_game_results" ON public.game_results;

-- Allow frontend (anon/authenticated) to READ game state (needed for round_id)
CREATE POLICY "allow_anon_read_game_state"
ON public.global_game_state
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow frontend (anon/authenticated) to READ game history
CREATE POLICY "allow_anon_read_game_results"
ON public.game_results
FOR SELECT
TO anon, authenticated
USING (true);
