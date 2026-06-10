-- WORLD CUP 2026 PREDICTION DATABASE SCHEMA

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create players table
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- SHA-256 hash of password
    role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create matches table
CREATE TABLE IF NOT EXISTS public.matches (
    id INT PRIMARY KEY, -- Match number 1 to 104
    stage TEXT NOT NULL, -- 'Vòng bảng', 'Vòng 1/16', 'Vòng 1/8', 'Tứ kết', 'Bán kết', 'Tranh hạng 3', 'Chung kết'
    multiplier NUMERIC NOT NULL DEFAULT 1,
    group_name TEXT, -- 'A', 'B', 'C'..., NULL for knockout
    team_a TEXT NOT NULL,
    team_b TEXT NOT NULL,
    stadium TEXT,
    kickoff TIMESTAMP WITH TIME ZONE NOT NULL,
    score_a INT, -- null if not played
    score_b INT, -- null if not played
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'LIVE', 'FT')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index on kickoff for quick sorting
CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON public.matches(kickoff);

-- 3. Create predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    match_id INT REFERENCES public.matches(id) ON DELETE CASCADE,
    predict_a INT, -- predicted score for Team A
    predict_b INT, -- predicted score for Team B
    points NUMERIC NOT NULL DEFAULT 0, -- calculated points (can be negative or positive)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (player_id, match_id)
);

-- Index on match_id
CREATE INDEX IF NOT EXISTS idx_predictions_match ON public.predictions(match_id);

-- 4. Create function to calculate scores for a specific match
CREATE OR REPLACE FUNCTION public.calculate_match_points(match_id_in INT)
RETURNS VOID AS $$
DECLARE
    r_match RECORD;
    r_player RECORD;
    r_pred RECORD;
    
    -- Penalty parameters
    p_xt NUMERIC; -- Sai xu thế
    p_ts NUMERIC; -- Sai tỷ số (mỗi bàn chênh)
    p_kdd NUMERIC; -- Không dự đoán
    
    -- Calculation variables
    act_a INT;
    act_b INT;
    pred_a INT;
    pred_b INT;
    
    tend_act INT;
    tend_pred INT;
    goal_diff_err INT;
    
    player_points NUMERIC;
    total_lost_points NUMERIC := 0;
    exact_count INT := 0;
    bonus_per_winner NUMERIC := 0;
    
BEGIN
    -- Fetch match info
    SELECT * INTO r_match FROM public.matches WHERE id = match_id_in;
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Only calculate if match is finished (status = 'FT') and scores are entered
    IF r_match.status <> 'FT' OR r_match.score_a IS NULL OR r_match.score_b IS NULL THEN
        RETURN;
    END IF;
    
    act_a := r_match.score_a;
    act_b := r_match.score_b;
    tend_act := sign(act_a - act_b);
    
    -- Set penalties based on stage
    CASE r_match.stage
        WHEN 'Vòng bảng' THEN
            p_xt := 5; p_ts := 2; p_kdd := 15;
        WHEN 'Vòng 1/16' THEN
            p_xt := 10; p_ts := 4; p_kdd := 20;
        WHEN 'Vòng 1/8' THEN
            p_xt := 12; p_ts := 5; p_kdd := 25;
        WHEN 'Tứ kết' THEN
            p_xt := 15; p_ts := 6; p_kdd := 30;
        WHEN 'Bán kết' THEN
            p_xt := 20; p_ts := 8; p_kdd := 50;
        WHEN 'Tranh hạng 3' THEN
            p_xt := 30; p_ts := 12; p_kdd := 70;
        WHEN 'Chung kết' THEN
            p_xt := 30; p_ts := 12; p_kdd := 70;
        ELSE
            p_xt := 5; p_ts := 2; p_kdd := 15; -- Fallback
    END CASE;
    
    -- Create temporary table to store intermediate player points
    CREATE TEMP TABLE player_match_calc (
        p_id UUID,
        m_points NUMERIC,
        is_exact BOOLEAN
    ) ON COMMIT DROP;
    
    -- Iterate through all players
    FOR r_player IN SELECT id FROM public.players LOOP
        -- Get prediction
        SELECT * INTO r_pred FROM public.predictions 
        WHERE player_id = r_player.id AND match_id = match_id_in;
        
        IF NOT FOUND OR r_pred.predict_a IS NULL OR r_pred.predict_b IS NULL THEN
            -- Case 1: No prediction
            player_points := -p_kdd;
            
            -- Insert missing prediction row for tracking points
            INSERT INTO public.predictions (player_id, match_id, predict_a, predict_b, points, updated_at)
            VALUES (r_player.id, match_id_in, NULL, NULL, player_points, now())
            ON CONFLICT (player_id, match_id) DO UPDATE SET points = player_points, updated_at = now();
            
            -- Accumulate lost points pool (absolute value)
            total_lost_points := total_lost_points + p_kdd;
            
            INSERT INTO player_match_calc VALUES (r_player.id, player_points, FALSE);
        ELSE
            pred_a := r_pred.predict_a;
            pred_b := r_pred.predict_b;
            
            -- Case 4: Exact Score Match
            IF pred_a = act_a AND pred_b = act_b THEN
                exact_count := exact_count + 1;
                INSERT INTO player_match_calc VALUES (r_player.id, 0, TRUE);
            ELSE
                -- Case 2 & 3: Wrong predictions (Apply Additive penalties)
                player_points := 0;
                
                -- 1. Tendency check
                tend_pred := sign(pred_a - pred_b);
                IF tend_act <> tend_pred THEN
                    player_points := player_points - p_xt;
                END IF;
                
                -- 2. Score difference check
                goal_diff_err := abs(pred_a - act_a) + abs(pred_b - act_b);
                player_points := player_points - (goal_diff_err * p_ts);
                
                -- Accumulate lost points pool (absolute value)
                total_lost_points := total_lost_points + abs(player_points);
                
                -- Update points in database
                UPDATE public.predictions SET points = player_points, updated_at = now()
                WHERE player_id = r_player.id AND match_id = match_id_in;
                
                INSERT INTO player_match_calc VALUES (r_player.id, player_points, FALSE);
            END IF;
        END IF;
    END LOOP;
    
    -- If there are exact match winners, distribute 40% of the lost points pool
    IF exact_count > 0 AND total_lost_points > 0 THEN
        bonus_per_winner := round((total_lost_points * 0.4) / exact_count, 1);
        
        -- Update the winners with their positive points in predictions table
        FOR r_pred IN SELECT p_id FROM player_match_calc WHERE is_exact = TRUE LOOP
            UPDATE public.predictions 
            SET points = bonus_per_winner, updated_at = now()
            WHERE player_id = r_pred.p_id AND match_id = match_id_in;
        END LOOP;
    END IF;
    
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger to automatically run score calculations on match update
CREATE OR REPLACE FUNCTION public.trg_on_match_result_update()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changes to 'FT' or scores are updated
    IF (OLD.status <> 'FT' AND NEW.status = 'FT') OR 
       (NEW.status = 'FT' AND (OLD.score_a IS DISTINCT FROM NEW.score_a OR OLD.score_b IS DISTINCT FROM NEW.score_b)) THEN
        PERFORM public.calculate_match_points(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_match_result_update
AFTER UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_on_match_result_update();

-- 5b. Trigger to prevent cheat: check lock time before predictions update/insert
CREATE OR REPLACE FUNCTION public.trg_check_prediction_lock()
RETURNS TRIGGER AS $$
DECLARE
    v_kickoff TIMESTAMP WITH TIME ZONE;
    v_lock_time TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT kickoff INTO v_kickoff FROM public.matches WHERE id = NEW.match_id;
    
    -- Lock time is 15 minutes before kickoff
    v_lock_time := v_kickoff - INTERVAL '15 minutes';
    
    IF now() > v_lock_time THEN
        RAISE EXCEPTION 'Trận đấu đã khóa dự đoán (15 phút trước giờ bóng lăn)!';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_predictions_lock_check
BEFORE INSERT OR UPDATE ON public.predictions
FOR EACH ROW
EXECUTE FUNCTION public.trg_check_prediction_lock();

-- 6. Helper View for Ranking/Leaderboard
CREATE OR REPLACE VIEW public.leaderboard AS
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
