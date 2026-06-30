import CONFIG from './config.js';

let supabaseInstance = null;

// Mock Data for Demo/Local Mode
const MOCK_PLAYERS = [
    { id: "p1", name: "Hoàng Hữu Thắng", email: "player1@wc2026.com", role: "admin" },
    { id: "p2", name: "Nguyễn Thanh Sơn", email: "player2@wc2026.com", role: "player" },
    { id: "p3", name: "Phạm Thị Thu Hằng", email: "player3@wc2026.com", role: "player" },
    { id: "p4", name: "Trần Minh Đức", email: "player4@wc2026.com", role: "player" },
    { id: "p5", name: "Nguyễn Văn Trường", email: "player5@wc2026.com", role: "player" },
    { id: "p6", name: "Nguyễn Trí Dũng", email: "player6@wc2026.com", role: "player" },
    { id: "p7", name: "Hà Hải Ninh", email: "player7@wc2026.com", role: "player" },
    { id: "p8", name: "Lưu Văn Huyên", email: "player8@wc2026.com", role: "player" },
    { id: "p9", name: "Hoàng Thị Thu Hà", email: "player9@wc2026.com", role: "player" },
    { id: "p10", name: "Trần Đức Việt", email: "player10@wc2026.com", role: "player" },
    { id: "p11", name: "Đặng Trung Kiên", email: "player11@wc2026.com", role: "player" },
    { id: "p12", name: "Phan Võ Thành Long", email: "player12@wc2026.com", role: "player" },
    { id: "p13", name: "Hoàng Văn Lâm", email: "player13@wc2026.com", role: "player" },
    { id: "p14", name: "Trương Hoàng Nam", email: "player14@wc2026.com", role: "player" }
];

const MOCK_MATCHES_INIT = [
    { id: 1, stage: "Vòng bảng", multiplier: 1, group_name: "A", team_a: "Mexico", team_b: "South Africa", stadium: "Estadio Azteca", kickoff: "2026-06-12T01:59:59+07:00", score_a: null, score_b: null, status: "SCHEDULED" },
    { id: 2, stage: "Vòng bảng", multiplier: 1, group_name: "A", team_a: "Korea Republic", team_b: "Czechia", stadium: "Estadio Akron", kickoff: "2026-06-12T09:00:00+07:00", score_a: null, score_b: null, status: "SCHEDULED" },
    { id: 3, stage: "Vòng bảng", multiplier: 1, group_name: "A", team_a: "Czechia", team_b: "South Africa", stadium: "Mercedes-Benz Stadium", kickoff: "2026-06-18T22:59:59+07:00", score_a: null, score_b: null, status: "SCHEDULED" },
    { id: 4, stage: "Vòng bảng", multiplier: 1, group_name: "A", team_a: "Mexico", team_b: "Korea Republic", stadium: "Estadio Akron", kickoff: "2026-06-19T07:59:59+07:00", score_a: null, score_b: null, status: "SCHEDULED" },
    { id: 5, stage: "Vòng bảng", multiplier: 1, group_name: "A", team_a: "Czechia", team_b: "Mexico", stadium: "Estadio Azteca", kickoff: "2026-06-25T07:59:59+07:00", score_a: null, score_b: null, status: "SCHEDULED" },
    { id: 7, stage: "Vòng bảng", multiplier: 1, group_name: "B", team_a: "Canada", team_b: "Bosnia & Herzegovina", stadium: "BMO Field", kickoff: "2026-06-13T01:59:59+07:00", score_a: null, score_b: null, status: "SCHEDULED" },
    { id: 8, stage: "Vòng bảng", multiplier: 1, group_name: "B", team_a: "Qatar", team_b: "Switzerland", stadium: "Levi's Stadium", kickoff: "2026-06-14T01:59:59+07:00", score_a: null, score_b: null, status: "SCHEDULED" },
    { id: 73, stage: "Vòng 1/16", multiplier: 1.5, group_name: "R32", team_a: "Á quân bảng A", team_b: "Á quân bảng B", stadium: "SoFi Stadium", kickoff: "2026-06-29T01:59:59+07:00", score_a: null, score_b: null, status: "SCHEDULED" },
    { id: 89, stage: "Vòng 1/8", multiplier: 2.0, group_name: "R16", team_a: "Thắng R32 trận 74", team_b: "Thắng R32 trận 75", stadium: "NRG Stadium", kickoff: "2026-07-05T00:00:00+07:00", score_a: null, score_b: null, status: "SCHEDULED" },
    { id: 104, stage: "Chung kết", multiplier: 4.0, group_name: "Final", team_a: "Thắng BK trận 101", team_b: "Thắng BK trận 102", stadium: "MetLife Stadium", kickoff: "2026-07-20T01:59:59+07:00", score_a: null, score_b: null, status: "SCHEDULED" }
];

export function isDemoMode() {
    return window.sessionStorage.getItem('WC_DEMO_MODE') === 'true';
}

export function setDemoMode(enable) {
    if (enable) {
        window.sessionStorage.setItem('WC_DEMO_MODE', 'true');
        if (!localStorage.getItem('WC_MOCK_PREDICTIONS')) {
            // Seed a few dummy predictions for other players to make leaderboard look alive
            const dummyPreds = [];
            MOCK_PLAYERS.forEach(p => {
                if (p.id !== 'p1') { // Do not pre-fill for the logged-in mock admin Hoàng Hữu Thắng
                    dummyPreds.push(
                        { player_id: p.id, match_id: 1, predict_a: Math.floor(Math.random() * 3), predict_b: Math.floor(Math.random() * 3), points: 0 },
                        { player_id: p.id, match_id: 2, predict_a: Math.floor(Math.random() * 3), predict_b: Math.floor(Math.random() * 3), points: 0 }
                    );
                }
            });
            localStorage.setItem('WC_MOCK_PREDICTIONS', JSON.stringify(dummyPreds));
        }
        seedMockChampionPredictions();
    } else {
        window.sessionStorage.removeItem('WC_DEMO_MODE');
    }
}

// Seed mock champion predictions for all players (Demo Mode)
function seedMockChampionPredictions() {
    if (!localStorage.getItem('WC_MOCK_CHAMPION_PREDICTIONS')) {
        const teams = [
            "Á quân bảng A", "Á quân bảng B", "Nhất bảng C", "Nhất bảng E", 
            "Nhất bảng F", "Nhất bảng I", "Nhất bảng G", "Nhất bảng D", 
            "Nhất bảng H", "Nhất bảng J", "Nhất bảng K", "Á quân bảng E"
        ];
        const mockChampionPreds = [];
        MOCK_PLAYERS.forEach(p => {
            // Pre-fill prediction for Hoàng Hữu Thắng (p1) to show it works, others randomized
            const randomTeam = p.id === 'p1' ? 'Nhất bảng C' : teams[Math.floor(Math.random() * teams.length)];
            mockChampionPreds.push({
                player_id: p.id,
                predicted_team: randomTeam,
                points: -100
            });
        });
        localStorage.setItem('WC_MOCK_CHAMPION_PREDICTIONS', JSON.stringify(mockChampionPreds));
    }
}

// Initialize and get the Supabase Client instance
export function getSupabase() {
    if (isDemoMode()) return null;
    if (!CONFIG.isConfigured()) {
        return null;
    }
    if (!supabaseInstance) {
        if (typeof window.supabase === 'undefined') {
            console.error('Supabase SDK not loaded. Make sure the CDN script is included.');
            return null;
        }
        supabaseInstance = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    }
    return supabaseInstance;
}

export function resetSupabase() {
    supabaseInstance = null;
}

// SHA-256 implementation in pure JS (for login checking)
export async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Fetch all players (for login selection and admin options)
export async function fetchPlayers() {
    if (isDemoMode()) {
        const custom = JSON.parse(localStorage.getItem('WC_MOCK_CUSTOM_PLAYERS') || '[]');
        return [...MOCK_PLAYERS, ...custom];
    }
    const supabase = getSupabase();
    if (!supabase) return [];
    
    const { data, error } = await supabase
        .from('players')
        .select('id, name, email, role')
        .order('name');
        
    if (error) {
        console.error('Error fetching players:', error);
        return [];
    }
    return data;
}

// Add a new player
export async function addPlayer(name, email, role, password) {
    const hash = await hashPassword(password);
    
    // Find the score of the last person on the leaderboard
    let lastPlaceScore = 0;
    try {
        const board = await fetchLeaderboard();
        if (board && board.length > 0) {
            // board is already sorted descending by total_points
            lastPlaceScore = Math.min(...board.map(p => p.total_points));
        }
    } catch (err) {
        console.error('Error fetching leaderboard for starting points:', err);
    }

    if (isDemoMode()) {
        const custom = JSON.parse(localStorage.getItem('WC_MOCK_CUSTOM_PLAYERS') || '[]');
        
        // Check if email already exists
        const exists = [...MOCK_PLAYERS, ...custom].some(p => p.email.toLowerCase() === email.toLowerCase());
        if (exists) {
            return { success: false, error: 'Email đã tồn tại trong hệ thống!' };
        }
        
        const newPlayer = {
            id: `cp-${Date.now()}`,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            role: role,
            starting_points: lastPlaceScore
        };
        
        custom.push(newPlayer);
        localStorage.setItem('WC_MOCK_CUSTOM_PLAYERS', JSON.stringify(custom));

        const customPasswords = JSON.parse(localStorage.getItem('WC_MOCK_CUSTOM_PASSWORDS') || '{}');
        customPasswords[newPlayer.id] = password;
        localStorage.setItem('WC_MOCK_CUSTOM_PASSWORDS', JSON.stringify(customPasswords));

        return { success: true, player: newPlayer };
    }
    
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Database not connected' };
    
    const { data, error } = await supabase
        .from('players')
        .insert({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password_hash: hash,
            role: role,
            starting_points: lastPlaceScore
        })
        .select()
        .single();
        
    if (error) {
        console.error('Error adding player:', error);
        return { success: false, error: error.message };
    }
    return { success: true, player: data };
}

// Delete a player
export async function deletePlayer(playerId) {
    if (isDemoMode()) {
        let custom = JSON.parse(localStorage.getItem('WC_MOCK_CUSTOM_PLAYERS') || '[]');
        const idx = custom.findIndex(p => p.id === playerId);
        if (idx > -1) {
            custom.splice(idx, 1);
            localStorage.setItem('WC_MOCK_CUSTOM_PLAYERS', JSON.stringify(custom));
            return { success: true };
        }
        // Cannot delete default mock players
        if (MOCK_PLAYERS.some(p => p.id === playerId)) {
            return { success: false, error: 'Không thể xóa thành viên mặc định của hệ thống Demo!' };
        }
        return { success: false, error: 'Không tìm thấy thành viên!' };
    }
    
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Database not connected' };
    
    const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);
        
    if (error) {
        console.error('Error deleting player:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

// Resolve placeholder team name dynamically
function resolveTeamName(teamName, matches) {
    if (!teamName) return "";
    const match = teamName.match(/^(Thắng|Thua)\s+.*\s+trận\s+(\d+)$/);
    if (!match) {
        return teamName;
    }
    
    const type = match[1];
    const matchId = parseInt(match[2], 10);
    
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) {
        return teamName;
    }
    
    if (targetMatch.status !== 'FT' || targetMatch.score_a === null || targetMatch.score_b === null) {
        return teamName;
    }
    
    const teamA = resolveTeamName(targetMatch.team_a, matches);
    const teamB = resolveTeamName(targetMatch.team_b, matches);
    
    if (targetMatch.score_a > targetMatch.score_b) {
        return type === 'Thắng' ? teamA : teamB;
    } else if (targetMatch.score_b > targetMatch.score_a) {
        return type === 'Thắng' ? teamB : teamA;
    } else {
        return teamName;
    }
}

// Helper to determine winner/loser of a knockout match
function getMatchResult(match, matches) {
    if (!match || match.status !== 'FT' || match.score_a === null || match.score_b === null) {
        return null;
    }
    
    const teamA = resolveTeamName(match.team_a, matches);
    const teamB = resolveTeamName(match.team_b, matches);
    
    if (match.score_a > match.score_b) {
        return { winner: teamA, loser: teamB };
    } else if (match.score_b > match.score_a) {
        return { winner: teamB, loser: teamA };
    } else {
        return null;
    }
}

// Propagate winners to subsequent rounds
function propagateWinners(matches) {
    let changed = false;
    for (let pass = 0; pass < 5; pass++) {
        let passChanged = false;
        matches.forEach(m => {
            const result = getMatchResult(m, matches);
            if (result) {
                const stageCode = m.stage === 'Vòng 1/16' ? 'R32' : m.stage === 'Vòng 1/8' ? 'R16' : m.stage === 'Tứ kết' ? 'TK' : m.stage === 'Bán kết' ? 'BK' : '';
                if (!stageCode) return;
                
                const winnerPlaceholder = `Thắng ${stageCode} trận ${m.id}`;
                const loserPlaceholder = `Thua ${stageCode} trận ${m.id}`;
                
                matches.forEach(nextMatch => {
                    if (nextMatch.team_a === winnerPlaceholder) {
                        nextMatch.team_a = result.winner;
                        passChanged = true;
                    }
                    if (nextMatch.team_a === loserPlaceholder) {
                        nextMatch.team_a = result.loser;
                        passChanged = true;
                    }
                    if (nextMatch.team_b === winnerPlaceholder) {
                        nextMatch.team_b = result.winner;
                        passChanged = true;
                    }
                    if (nextMatch.team_b === loserPlaceholder) {
                        nextMatch.team_b = result.loser;
                        passChanged = true;
                    }
                });
            }
        });
        if (!passChanged) break;
        changed = true;
    }
    return changed;
}

// Fetch matches
export async function fetchMatches() {
    let matches = [];
    if (isDemoMode()) {
        try {
            const stored = localStorage.getItem('WC_MOCK_MATCHES');
            if (stored) {
                matches = JSON.parse(stored);
                // Clear cache if matches have the old stage name formats
                if (matches.some(m => m.stage && (m.stage.includes('(R32)') || m.stage.includes('(R16)')))) {
                    matches = [];
                }
            }
            // If empty or incomplete, fetch the full list of 104 matches
            if (matches.length < 104) {
                const res = await fetch('./matches.json');
                matches = await res.json();
                localStorage.setItem('WC_MOCK_MATCHES', JSON.stringify(matches));
            }
        } catch (err) {
            console.error('Error loading mock matches.json:', err);
        }
    } else {
        const supabase = getSupabase();
        if (!supabase) return [];
        
        const { data, error } = await supabase
            .from('matches')
            .select('*')
            .order('kickoff', { ascending: true })
            .order('id', { ascending: true });
            
        if (error) {
            console.error('Error fetching matches:', error);
            return [];
        }
        matches = data || [];
    }
    
    // Dynamic bracket propagation
    propagateWinners(matches);
    return matches;
}

// Fetch predictions for a specific player
export async function fetchPlayerPredictions(playerId) {
    if (isDemoMode()) {
        const preds = JSON.parse(localStorage.getItem('WC_MOCK_PREDICTIONS') || '[]');
        return preds.filter(p => p.player_id === playerId);
    }
    const supabase = getSupabase();
    if (!supabase) return [];
    
    const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('player_id', playerId);
        
    if (error) {
        console.error('Error fetching player predictions:', error);
        return [];
    }
    return data;
}

// Fetch all predictions in the system (for the Matrix view)
export async function fetchAllPredictions() {
    if (isDemoMode()) {
        return JSON.parse(localStorage.getItem('WC_MOCK_PREDICTIONS') || '[]');
    }
    const supabase = getSupabase();
    if (!supabase) return [];
    
    let allData = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;
    
    while (hasMore) {
        const { data, error } = await supabase
            .from('predictions')
            .select('player_id, match_id, predict_a, predict_b, points')
            .range(from, from + batchSize - 1);
            
        if (error) {
            console.error('Error fetching all predictions:', error);
            return allData; // Return whatever we managed to fetch
        }
        
        if (data && data.length > 0) {
            allData = allData.concat(data);
            if (data.length < batchSize) {
                hasMore = false;
            } else {
                from += batchSize;
            }
        } else {
            hasMore = false;
        }
    }
    return allData;
}

// Submit/Upsert a prediction
export async function submitPrediction(playerId, matchId, predictA, predictB) {
    if (isDemoMode()) {
        const preds = JSON.parse(localStorage.getItem('WC_MOCK_PREDICTIONS') || '[]');
        const idx = preds.findIndex(p => p.player_id === playerId && p.match_id === matchId);
        
        const newPred = {
            player_id: playerId,
            match_id: matchId,
            predict_a: predictA,
            predict_b: predictB,
            points: 0
        };
        
        if (idx > -1) {
            preds[idx] = newPred;
        } else {
            preds.push(newPred);
        }
        
        localStorage.setItem('WC_MOCK_PREDICTIONS', JSON.stringify(preds));
        return { success: true };
    }
    
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Database not connected' };
    
    // Check if match already started (15 mins buffer)
    const { data: match, error: matchErr } = await supabase
        .from('matches')
        .select('kickoff, status')
        .eq('id', matchId)
        .single();
        
    if (matchErr || !match) {
        return { success: false, error: 'Match not found' };
    }
    
    const kickoffTime = new Date(match.kickoff);
    const now = new Date();
    const lockTime = new Date(kickoffTime.getTime() - 15 * 60 * 1000); // 15 mins lock
    
    if (now > lockTime || match.status === 'FT' || match.status === 'LIVE') {
        return { success: false, error: 'Match is locked for predictions (15 mins before kickoff or match has started)' };
    }
    
    const { error } = await supabase
        .from('predictions')
        .upsert({
            player_id: playerId,
            match_id: matchId,
            predict_a: predictA,
            predict_b: predictB,
            updated_at: new Date().toISOString()
        }, { onConflict: 'player_id,match_id' });
        
    if (error) {
        console.error('Error submitting prediction:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

// Local mock calculation matching postgres stored procedure logic
function calculateMockPoints(matchId, scoreA, scoreB) {
    const matches = JSON.parse(localStorage.getItem('WC_MOCK_MATCHES') || '[]');
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    
    const preds = JSON.parse(localStorage.getItem('WC_MOCK_PREDICTIONS') || '[]');
    
    // Penalty config
    let p_xt = 5, p_ts = 2, p_kdd = 15;
    if (match.stage === 'Vòng 1/16') { p_xt = 10; p_ts = 4; p_kdd = 20; }
    else if (match.stage === 'Vòng 1/8') { p_xt = 12; p_ts = 5; p_kdd = 25; }
    else if (match.stage === 'Tứ kết') { p_xt = 15; p_ts = 6; p_kdd = 30; }
    else if (match.stage === 'Bán kết') { p_xt = 20; p_ts = 8; p_kdd = 50; }
    else if (match.stage === 'Tranh hạng 3' || match.stage === 'Chung kết') { p_xt = 30; p_ts = 12; p_kdd = 70; }
    
    let totalLostPoints = 0;
    let exactWinners = [];
    
    const custom = JSON.parse(localStorage.getItem('WC_MOCK_CUSTOM_PLAYERS') || '[]');
    const allPlayers = [...MOCK_PLAYERS, ...custom];
    
    allPlayers.forEach(p => {
        let pred = preds.find(pr => pr.player_id === p.id && pr.match_id === matchId);
        
        if (!pred || pred.predict_a === null || pred.predict_b === null) {
            // No prediction
            const pts = -p_kdd;
            totalLostPoints += p_kdd;
            
            const newPred = { player_id: p.id, match_id: matchId, predict_a: null, predict_b: null, points: pts };
            const idx = preds.findIndex(pr => pr.player_id === p.id && pr.match_id === matchId);
            if (idx > -1) preds[idx] = newPred; else preds.push(newPred);
        } else {
            if (pred.predict_a === scoreA && pred.predict_b === scoreB) {
                exactWinners.push(p.id);
            } else {
                let pts = 0;
                // Tendency check
                const tend_act = Math.sign(scoreA - scoreB);
                const tend_pred = Math.sign(pred.predict_a - pred.predict_b);
                if (tend_act !== tend_pred) {
                    pts -= p_xt;
                }
                // Score error check
                const diff = Math.abs(pred.predict_a - scoreA) + Math.abs(pred.predict_b - scoreB);
                pts -= (diff * p_ts);
                
                pred.points = pts;
                totalLostPoints += Math.abs(pts);
            }
        }
    });
    
    // Distribute 40% of pool to winners
    if (exactWinners.length > 0 && totalLostPoints > 0) {
        const bonus = Math.round(((totalLostPoints * 0.4) / exactWinners.length) * 10) / 10;
        exactWinners.forEach(pId => {
            const pred = preds.find(pr => pr.player_id === pId && pr.match_id === matchId);
            if (pred) {
                pred.points = bonus;
            } else {
                preds.push({ player_id: pId, match_id: matchId, predict_a: scoreA, predict_b: scoreB, points: bonus });
            }
        });
    } else {
        // If there are exact winners but no pool lost (impossible in real, but to prevent NaN), or 0 winners
        exactWinners.forEach(pId => {
            const pred = preds.find(pr => pr.player_id === pId && pr.match_id === matchId);
            if (pred) pred.points = 0;
        });
    }
    
    localStorage.setItem('WC_MOCK_PREDICTIONS', JSON.stringify(preds));
}

// Admin update match scores, status and team names (useful for knockout stages)
export async function updateMatchResult(matchId, scoreA, scoreB, status, teamA = null, teamB = null) {
    if (isDemoMode()) {
        const matches = JSON.parse(localStorage.getItem('WC_MOCK_MATCHES') || '[]');
        const idx = matches.findIndex(m => m.id === matchId);
        if (idx > -1) {
            matches[idx].score_a = scoreA;
            matches[idx].score_b = scoreB;
            matches[idx].status = status;
            if (teamA) matches[idx].team_a = teamA;
            if (teamB) matches[idx].team_b = teamB;
            
            // Bracket winner propagation
            propagateWinners(matches);
            
            // Also update any mock champion predictions that matched the placeholders
            const champPreds = JSON.parse(localStorage.getItem('WC_MOCK_CHAMPION_PREDICTIONS') || '[]');
            let cpChanged = false;
            champPreds.forEach(cp => {
                const resolved = resolveTeamName(cp.predicted_team, matches);
                if (resolved !== cp.predicted_team) {
                    cp.predicted_team = resolved;
                    cpChanged = true;
                }
            });
            if (cpChanged) {
                localStorage.setItem('WC_MOCK_CHAMPION_PREDICTIONS', JSON.stringify(champPreds));
            }
            
            localStorage.setItem('WC_MOCK_MATCHES', JSON.stringify(matches));
            
            // Calculate points if finished
            if (status === 'FT') {
                calculateMockPoints(matchId, scoreA, scoreB);
            }
            return { success: true };
        }
        return { success: false, error: 'Match not found' };
    }
    
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Database not connected' };
    
    const updateData = {
        score_a: scoreA,
        score_b: scoreB,
        status: status
    };
    if (teamA) updateData.team_a = teamA;
    if (teamB) updateData.team_b = teamB;
    
    const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', matchId);
        
    if (error) {
        console.error('Error updating match results:', error);
        return { success: false, error: error.message };
    }
    
    // Persistent winner propagation in Supabase mode
    try {
        const { data: allMatches, error: fetchErr } = await supabase
            .from('matches')
            .select('*')
            .order('kickoff', { ascending: true })
            .order('id', { ascending: true });
            
        if (!fetchErr && allMatches) {
            const matchesClone = JSON.parse(JSON.stringify(allMatches));
            const hasChanges = propagateWinners(matchesClone);
            
            if (hasChanges) {
                // Update match placeholders in DB
                for (let i = 0; i < allMatches.length; i++) {
                    const orig = allMatches[i];
                    const updated = matchesClone[i];
                    if (orig.team_a !== updated.team_a || orig.team_b !== updated.team_b) {
                        await supabase
                            .from('matches')
                            .update({
                                team_a: updated.team_a,
                                team_b: updated.team_b
                            })
                            .eq('id', updated.id);
                    }
                }
                
                // Update champion prediction placeholders in DB
                const { data: champPreds, error: cpErr } = await supabase
                    .from('champion_predictions')
                    .select('*');
                    
                if (!cpErr && champPreds) {
                    for (const cp of champPreds) {
                        const resolved = resolveTeamName(cp.predicted_team, matchesClone);
                        if (resolved !== cp.predicted_team) {
                            await supabase
                                .from('champion_predictions')
                                .update({ predicted_team: resolved })
                                .eq('player_id', cp.player_id);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error propagating winners in database:', err);
    }
    
    return { success: true };
}

// Fetch leaderboard data (or calculate locally if in demo mode)
export async function fetchLeaderboard() {
    if (isDemoMode()) {
        const preds = JSON.parse(localStorage.getItem('WC_MOCK_PREDICTIONS') || '[]');
        const champPreds = JSON.parse(localStorage.getItem('WC_MOCK_CHAMPION_PREDICTIONS') || '[]');
        const matches = await fetchMatches();
        
        const players = await fetchPlayers();
        const isKnockoutActivated = matches.some(m => m.stage !== 'Vòng bảng' && m.status === 'FT');
        
        const board = players.map(p => {
            const pPreds = preds.filter(pr => pr.player_id === p.id);
            
            const startPts = parseFloat(p.starting_points || 0);
            
            let groupPoints = startPts;
            let knockoutPoints = 0;
            let predicted = 0;
            let exact = 0;
            let bonus = 0;
            
            pPreds.forEach(pr => {
                const matchVal = matches.find(m => m.id === pr.match_id);
                const pts = parseFloat(pr.points || 0);
                
                if (matchVal && matchVal.stage === 'Vòng bảng') {
                    groupPoints += pts;
                } else if (isKnockoutActivated) {
                    knockoutPoints += pts;
                }
                
                if (pr.predict_a !== null) {
                    predicted++;
                }
                if (pts > 0) {
                    exact++;
                    bonus += pts;
                }
            });
            
            // Add champion prediction points
            const cPred = champPreds.find(cp => cp.player_id === p.id);
            if (isKnockoutActivated && cPred && cPred.predicted_team) {
                const pts = parseFloat(cPred.points || 0);
                knockoutPoints += pts;
                if (pts > 0) {
                    bonus += pts;
                }
            }
            
            const total = groupPoints + knockoutPoints;
            
            return {
                player_id: p.id,
                player_name: p.name,
                group_points: Math.round(groupPoints * 10) / 10,
                knockout_points: Math.round(knockoutPoints * 10) / 10,
                total_points: Math.round(total * 10) / 10,
                matches_predicted: predicted,
                exact_matches: exact,
                total_bonus: Math.round(bonus * 10) / 10
            };
        });
        
        // Sort descending by knockout_points if knockout activated, otherwise total_points
        if (isKnockoutActivated) {
            return board.sort((a, b) => {
                if (b.knockout_points !== a.knockout_points) {
                    return b.knockout_points - a.knockout_points;
                }
                return b.total_points - a.total_points;
            });
        }
        return board.sort((a, b) => b.total_points - a.total_points);
    }
    
    const supabase = getSupabase();
    if (!supabase) return [];
    
    const { data, error } = await supabase
        .from('leaderboard')
        .select('*');
        
    if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }

    const matches = await fetchMatches();
    const isKnockoutStarted = matches.some(m => m.stage !== 'Vòng bảng' && m.status === 'FT');
    
    if (isKnockoutStarted) {
        return data.sort((a, b) => {
            if (b.knockout_points !== a.knockout_points) {
                return b.knockout_points - a.knockout_points;
            }
            return b.total_points - a.total_points;
        });
    }
    
    return data.sort((a, b) => b.total_points - a.total_points);
}

// Fetch special achievement awards for the Hall of Fame
export async function fetchSpecialAwards(matches) {
    const leaderboard = await fetchLeaderboard();
    const players = await fetchPlayers();
    
    // Helper to format multiple names cleanly
    function formatMultipleNames(namesArray) {
        if (!namesArray || namesArray.length === 0) return 'Chưa có';
        if (namesArray.length <= 2) return namesArray.join(', ');
        return `${namesArray.slice(0, 2).join(', ')}... (+${namesArray.length - 2})`;
    }

    // Determine current active round of the tournament
    const stagesOrder = ['Vòng bảng', 'Vòng 1/16', 'Vòng 1/8', 'Tứ kết', 'Bán kết', 'Tranh hạng 3', 'Chung kết'];
    
    // Determine completed stages
    const completedStages = [];
    stagesOrder.forEach(stage => {
        const stageMatches = matches.filter(m => m.stage === stage);
        if (stageMatches.length > 0 && stageMatches.every(m => m.status === 'FT')) {
            completedStages.push(stage);
        }
    });

    // Current round is the first stage that is not completed.
    // If all stages are completed, default to the last stage (Chung kết).
    let currentRound = 'Vòng bảng';
    const activeStage = stagesOrder.find(stage => !completedStages.includes(stage));
    if (activeStage) {
        currentRound = activeStage;
    } else {
        currentRound = stagesOrder[stagesOrder.length - 1];
    }

    // Check if knockout stage points are activated (any knockout match is finished)
    const isKnockoutStarted = matches.some(m => m.stage !== 'Vòng bảng' && m.status === 'FT');
    
    // a. Current Leader (Nhà vô địch hiện tại) - Resets on Knockout stage
    let leader = null;
    if (leaderboard.length > 0) {
        const sortedForLeader = [...leaderboard];
        if (isKnockoutStarted) {
            // Sort by knockout_points descending when in knockout phase
            sortedForLeader.sort((a, b) => b.knockout_points - a.knockout_points);
            const maxKnockoutPoints = sortedForLeader[0].knockout_points;
            const knockoutLeaders = sortedForLeader
                .filter(p => p.knockout_points === maxKnockoutPoints)
                .map(p => p.player_name);
            leader = { 
                name: formatMultipleNames(knockoutLeaders), 
                points: maxKnockoutPoints, 
                stage: 'Knockout' 
            };
        } else {
            // Sort by group_points descending when in group phase
            sortedForLeader.sort((a, b) => b.group_points - a.group_points);
            const maxGroupPoints = sortedForLeader[0].group_points;
            const groupLeaders = sortedForLeader
                .filter(p => p.group_points === maxGroupPoints)
                .map(p => p.player_name);
            leader = { 
                name: formatMultipleNames(groupLeaders), 
                points: maxGroupPoints, 
                stage: 'Vòng bảng' 
            };
        }
    }

    // b. Most Exact (Vua dự đoán)
    let maxExact = 0;
    let mostExactPlayers = [];
    leaderboard.forEach(p => {
        if (p.exact_matches > maxExact) {
            maxExact = p.exact_matches;
            mostExactPlayers = [p.player_name];
        } else if (p.exact_matches === maxExact && maxExact > 0) {
            mostExactPlayers.push(p.player_name);
        }
    });
    const mostExact = maxExact > 0 ? { name: formatMultipleNames(mostExactPlayers), value: maxExact } : null;

    // c. Get best predictions for ALL stages to build active record and archives
    const bestByStage = {};
    if (isDemoMode()) {
        const preds = JSON.parse(localStorage.getItem('WC_MOCK_PREDICTIONS') || '[]');
        const stagePredsMap = {};
        preds.forEach(pr => {
            const pts = parseFloat(pr.points || 0);
            if (pts > 0) {
                const match = matches.find(m => m.id === pr.match_id);
                if (match) {
                    const stage = match.stage;
                    if (!stagePredsMap[stage]) {
                        stagePredsMap[stage] = [];
                    }
                    const player = players.find(p => p.id === pr.player_id);
                    stagePredsMap[stage].push({
                        name: player ? player.name : 'Unknown',
                        points: pts,
                        match_str: `${match.team_a} vs ${match.team_b}`
                    });
                }
            }
        });
        
        stagesOrder.forEach(stage => {
            const stagePreds = stagePredsMap[stage];
            if (stagePreds && stagePreds.length > 0) {
                const maxPts = Math.max(...stagePreds.map(p => p.points));
                const winners = stagePreds.filter(p => p.points === maxPts);
                const winnerNames = winners.map(w => w.name);
                const uniqueMatches = [...new Set(winners.map(w => w.match_str))];
                bestByStage[stage] = {
                    name: formatMultipleNames(winnerNames),
                    points: Math.round(maxPts * 10) / 10,
                    match: uniqueMatches.join(', ')
                };
            }
        });
    } else {
        const supabase = getSupabase();
        if (supabase) {
            let allBestPreds = [];
            let from = 0;
            const batchSize = 1000;
            let hasMore = true;
            let pErr = null;
            
            while (hasMore) {
                const { data: batchData, error: err } = await supabase
                    .from('predictions')
                    .select(`
                        points,
                        match_id,
                        player_id,
                        matches (team_a, team_b, stage),
                        players (name)
                    `)
                    .gt('points', 0)
                    .order('points', { ascending: false })
                    .range(from, from + batchSize - 1);
                    
                if (err) {
                    pErr = err;
                    console.error('Error fetching best predictions:', err);
                    break;
                }
                
                if (batchData && batchData.length > 0) {
                    allBestPreds = allBestPreds.concat(batchData);
                    if (batchData.length < batchSize) {
                        hasMore = false;
                    } else {
                        from += batchSize;
                    }
                } else {
                    hasMore = false;
                }
            }

            if (!pErr && allBestPreds.length > 0) {
                const stagePredsMap = {};
                allBestPreds.forEach(pr => {
                    const mData = pr.matches ? (pr.matches[0] || pr.matches) : null;
                    if (mData) {
                        const stage = mData.stage;
                        if (!stagePredsMap[stage]) {
                            stagePredsMap[stage] = [];
                        }
                        const pName = pr.players ? (pr.players.name || pr.players[0]?.name) : 'Unknown';
                        stagePredsMap[stage].push({
                            name: pName,
                            points: parseFloat(pr.points),
                            match_str: `${mData.team_a} vs ${mData.team_b}`
                        });
                    }
                });
                
                stagesOrder.forEach(stage => {
                    const stagePreds = stagePredsMap[stage];
                    if (stagePreds && stagePreds.length > 0) {
                        const maxPts = Math.max(...stagePreds.map(p => p.points));
                        const winners = stagePreds.filter(p => p.points === maxPts);
                        const winnerNames = winners.map(w => w.name);
                        const uniqueMatches = [...new Set(winners.map(w => w.match_str))];
                        bestByStage[stage] = {
                            name: formatMultipleNames(winnerNames),
                            points: Math.round(maxPts * 10) / 10,
                            match: uniqueMatches.join(', ')
                        };
                    }
                });
            }
        }
    }

    // Active record card (Kỷ lục gia of the currentRound)
    const highestSingle = bestByStage[currentRound] ? {
        name: bestByStage[currentRound].name,
        points: bestByStage[currentRound].points,
        match: bestByStage[currentRound].match,
        round: currentRound
    } : null;

    // d. Most Dedicated (Cống Hiến Nhất) - bottom of the leaderboard (lowest points/most negative points)
    let mostDedicated = null;
    if (leaderboard.length > 0) {
        if (isKnockoutStarted) {
            // Sort by knockout_points ascending to find bottom players of knockout stage
            const sortedForDedicated = [...leaderboard].sort((a, b) => a.knockout_points - b.knockout_points);
            const minKnockoutPoints = sortedForDedicated[0].knockout_points;
            const bottomPlayers = sortedForDedicated
                .filter(p => p.knockout_points === minKnockoutPoints)
                .map(p => p.player_name);
            mostDedicated = { 
                name: formatMultipleNames(bottomPlayers), 
                value: minKnockoutPoints 
            };
        } else {
            // Sort by group_points ascending to find bottom players of group stage
            const sortedForDedicated = [...leaderboard].sort((a, b) => a.group_points - b.group_points);
            const minGroupPoints = sortedForDedicated[0].group_points;
            const bottomPlayers = sortedForDedicated
                .filter(p => p.group_points === minGroupPoints)
                .map(p => p.player_name);
            mostDedicated = { 
                name: formatMultipleNames(bottomPlayers), 
                value: minGroupPoints 
            };
        }
    }

    // e. Build archives list
    const archives = [];
    
    // Archive Group Stage Leader once Group Stage is completed
    const groupStageCompleted = completedStages.includes('Vòng bảng');
    if (groupStageCompleted && leaderboard.length > 0) {
        const sortedGroup = [...leaderboard].sort((a, b) => b.group_points - a.group_points);
        if (sortedGroup.length > 0) {
            const maxGroupPoints = sortedGroup[0].group_points;
            const groupLeaders = sortedGroup
                .filter(p => p.group_points === maxGroupPoints)
                .map(p => p.player_name);
            archives.push({
                icon: '👑',
                label: 'Vô địch Vòng bảng',
                name: formatMultipleNames(groupLeaders),
                detail: `${maxGroupPoints}đ`
            });
        }
    }

    // Archive completed stages records
    completedStages.forEach(stage => {
        if (bestByStage[stage]) {
            archives.push({
                icon: '⚡',
                label: `Kỷ lục ${stage}`,
                name: bestByStage[stage].name,
                detail: `+${bestByStage[stage].points}đ (${bestByStage[stage].match})`
            });
        }
    });

    return { leader, mostExact, highestSingle, mostDedicated, currentRound, archives };
}


// Login verification
export async function verifyPlayerLogin(email, password) {
    if (isDemoMode()) {
        const custom = JSON.parse(localStorage.getItem('WC_MOCK_CUSTOM_PLAYERS') || '[]');
        const allPlayers = [...MOCK_PLAYERS, ...custom];
        const player = allPlayers.find(p => p.email.toLowerCase() === email.toLowerCase());
        if (!player) return { success: false, error: 'Email không tồn tại!' };
        
        const customPasswords = JSON.parse(localStorage.getItem('WC_MOCK_CUSTOM_PASSWORDS') || '{}');
        const storedPass = customPasswords[player.id] || '123456';
        if (password !== storedPass) return { success: false, error: 'Mật khẩu không chính xác!' };
        
        return { 
            success: true, 
            player, 
            isDefaultPassword: (storedPass === '123456') 
        };
    }
    
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Database not connected' };
    
    const hash = await hashPassword(password);
    
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single();
        
    if (error || !data) {
        return { success: false, error: 'Email không tồn tại trong hệ thống!' };
    }
    
    if (data.password_hash !== hash) {
        return { success: false, error: 'Mật khẩu không chính xác!' };
    }
    
    const defaultHash = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
    
    return { 
        success: true, 
        player: { id: data.id, name: data.name, email: data.email, role: data.role },
        isDefaultPassword: (data.password_hash === defaultHash)
    };
}

// Admin or Self change player password/PIN
export async function adminChangePassword(playerId, newPassword) {
    if (isDemoMode()) {
        const customPasswords = JSON.parse(localStorage.getItem('WC_MOCK_CUSTOM_PASSWORDS') || '{}');
        customPasswords[playerId] = newPassword;
        localStorage.setItem('WC_MOCK_CUSTOM_PASSWORDS', JSON.stringify(customPasswords));
        return { success: true };
    }
    
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Database not connected' };
    
    const hash = await hashPassword(newPassword);
    
    const { error } = await supabase
        .from('players')
        .update({ password_hash: hash })
        .eq('id', playerId);
        
    if (error) {
        return { success: false, error: error.message };
    }
    return { success: true };
}

// Fetch champion prediction for a player
export async function fetchChampionPrediction(playerId) {
    if (isDemoMode()) {
        const preds = JSON.parse(localStorage.getItem('WC_MOCK_CHAMPION_PREDICTIONS') || '[]');
        return preds.find(p => p.player_id === playerId) || null;
    }
    const supabase = getSupabase();
    if (!supabase) return null;
    
    const { data, error } = await supabase
        .from('champion_predictions')
        .select('*')
        .eq('player_id', playerId)
        .maybeSingle();
        
    if (error) {
        console.error('Error fetching champion prediction:', error);
        return null;
    }
    return data;
}

// Submit champion prediction
export async function submitChampionPrediction(playerId, teamName) {
    if (isDemoMode()) {
        const preds = JSON.parse(localStorage.getItem('WC_MOCK_CHAMPION_PREDICTIONS') || '[]');
        const idx = preds.findIndex(p => p.player_id === playerId);
        const newPred = { player_id: playerId, predicted_team: teamName, points: -100 };
        if (idx > -1) {
            preds[idx] = newPred;
        } else {
            preds.push(newPred);
        }
        localStorage.setItem('WC_MOCK_CHAMPION_PREDICTIONS', JSON.stringify(preds));
        return { success: true };
    }
    
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Database not connected' };
    
    // Check lock time (Match 89 kickoff - 15 mins)
    const { data: match89, error: mErr } = await supabase
        .from('matches')
        .select('kickoff')
        .eq('id', 89)
        .single();
        
    if (mErr || !match89) {
        return { success: false, error: 'Cannot fetch Match 89 kickoff time' };
    }
    
    const lockTime = new Date(new Date(match89.kickoff).getTime() - 15 * 60 * 1000);
    if (new Date() > lockTime) {
        return { success: false, error: 'Thời gian dự đoán nhà vô địch đã khóa (15 phút trước trận đấu vòng 1/8 đầu tiên)' };
    }
    
    const { error } = await supabase
        .from('champion_predictions')
        .upsert({
            player_id: playerId,
            predicted_team: teamName,
            points: -100,
            updated_at: new Date().toISOString()
        }, { onConflict: 'player_id' });
        
    if (error) {
        console.error('Error submitting champion prediction:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
}

// Fetch all champion predictions
export async function fetchAllChampionPredictions() {
    if (isDemoMode()) {
        return JSON.parse(localStorage.getItem('WC_MOCK_CHAMPION_PREDICTIONS') || '[]');
    }
    const supabase = getSupabase();
    if (!supabase) return [];
    
    const { data, error } = await supabase
        .from('champion_predictions')
        .select('*');
        
    if (error) {
        console.error('Error fetching all champion predictions:', error);
        return [];
    }
    return data;
}

// Update champion winning result
export async function updateChampionResult(winningTeam) {
    if (isDemoMode()) {
        localStorage.setItem('WC_MOCK_CHAMPION_WINNER', winningTeam);
        
        const preds = JSON.parse(localStorage.getItem('WC_MOCK_CHAMPION_PREDICTIONS') || '[]');
        const totalPool = preds.length * 100;
        
        const correctCount = preds.filter(p => p.predicted_team === winningTeam).length;
        const bonus = correctCount > 0 ? Math.round(((totalPool * 0.5) / correctCount) * 10) / 10 : 0;
        
        preds.forEach(p => {
            if (p.predicted_team === winningTeam) {
                p.points = bonus;
            } else {
                p.points = -100;
            }
        });
        localStorage.setItem('WC_MOCK_CHAMPION_PREDICTIONS', JSON.stringify(preds));
        return { success: true };
    }
    
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Database not connected' };
    
    const { error } = await supabase.rpc('update_champion_result', { winning_team_in: winningTeam });
    if (error) {
        console.error('Error calling update_champion_result:', error);
        return { success: false, error: error.message };
    }
    
    return { success: true };
}
