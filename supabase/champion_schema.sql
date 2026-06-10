-- 1. Create champion_predictions table
CREATE TABLE IF NOT EXISTS public.champion_predictions (
    player_id UUID PRIMARY KEY REFERENCES public.players(id) ON DELETE CASCADE,
    predicted_team TEXT NOT NULL,
    points NUMERIC NOT NULL DEFAULT -50, -- -50 represents the bet value placed
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for quick joins
CREATE INDEX IF NOT EXISTS idx_champion_predictions_player ON public.champion_predictions(player_id);

-- Enable RLS (Row Level Security) if needed, otherwise allow public access matching the other tables
ALTER TABLE public.champion_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for anyone" ON public.champion_predictions FOR SELECT USING (true);
CREATE POLICY "Allow insert/update for users" ON public.champion_predictions FOR ALL USING (true) WITH CHECK (true);

-- 1b. Trigger to prevent cheat: check champion prediction lock time before update/insert
CREATE OR REPLACE FUNCTION public.trg_check_champion_prediction_lock()
RETURNS TRIGGER AS $$
DECLARE
    v_kickoff TIMESTAMP WITH TIME ZONE;
    v_lock_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Fetch kickoff time of Match 73 (first match of Vòng 1/16)
    SELECT kickoff INTO v_kickoff FROM public.matches WHERE id = 73;
    
    -- Lock time is 15 minutes before kickoff
    v_lock_time := v_kickoff - INTERVAL '15 minutes';
    
    IF now() > v_lock_time THEN
        RAISE EXCEPTION 'Dự đoán nhà vô địch đã khóa (15 phút trước khi vòng 1/16 bắt đầu)!';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_champion_predictions_lock_check
BEFORE INSERT OR UPDATE ON public.champion_predictions
FOR EACH ROW
EXECUTE FUNCTION public.trg_check_champion_prediction_lock();

-- 2. Stored Procedure to calculate/update champion predictions points
CREATE OR REPLACE FUNCTION public.update_champion_result(winning_team_in TEXT)
RETURNS VOID AS $$
DECLARE
    total_players_bet INT;
    correct_count INT;
    total_pool NUMERIC;
    bonus_points NUMERIC;
BEGIN
    -- Count players who placed a champion prediction (each bets 50 pts)
    SELECT COUNT(*) INTO total_players_bet FROM public.champion_predictions WHERE predicted_team IS NOT NULL;
    
    -- Calculate total pool
    total_pool := total_players_bet * 50;
    
    -- Count correct predictors
    SELECT COUNT(*) INTO correct_count FROM public.champion_predictions WHERE predicted_team = winning_team_in;
    
    -- First, default all players with predictions to -50 (wrong prediction)
    UPDATE public.champion_predictions 
    SET points = -50
    WHERE predicted_team IS NOT NULL;
    
    -- If there are correct predictors, distribute 50% of the pool
    IF correct_count > 0 THEN
        bonus_points := round((total_pool * 0.5) / correct_count, 1);
        
        UPDATE public.champion_predictions 
        SET points = bonus_points
        WHERE predicted_team = winning_team_in;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Stored Procedure to clear champion result (resets to -50)
CREATE OR REPLACE FUNCTION public.clear_champion_result()
RETURNS VOID AS $$
BEGIN
    UPDATE public.champion_predictions SET points = -50;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate the leaderboard view to incorporate champion predictions points
DROP VIEW IF EXISTS public.leaderboard;

CREATE VIEW public.leaderboard AS
SELECT 
    p.id AS player_id,
    p.name AS player_name,
    COALESCE(SUM(CASE WHEN m.stage = 'Vòng bảng' THEN pr.points ELSE 0 END), 0) AS group_points,
    (COALESCE(SUM(CASE WHEN m.stage <> 'Vòng bảng' THEN pr.points ELSE 0 END), 0) + COALESCE(MAX(cp.points), 0)) AS knockout_points,
    (COALESCE(SUM(pr.points), 0) + COALESCE(MAX(cp.points), 0)) AS total_points,
    COUNT(pr.match_id) FILTER (WHERE pr.predict_a IS NOT NULL) AS matches_predicted,
    COUNT(pr.match_id) FILTER (WHERE pr.points > 0) AS exact_matches,
    (COALESCE(SUM(CASE WHEN pr.points > 0 THEN pr.points ELSE 0 END), 0) + COALESCE(MAX(CASE WHEN cp.points > 0 THEN cp.points ELSE 0 END), 0)) AS total_bonus
FROM public.players p
LEFT JOIN public.predictions pr ON p.id = pr.player_id
LEFT JOIN public.matches m ON pr.match_id = m.id
LEFT JOIN public.champion_predictions cp ON p.id = cp.player_id
GROUP BY p.id, p.name;
