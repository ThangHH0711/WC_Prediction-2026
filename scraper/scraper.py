import os
import re
import json
import requests
import sys

# Team name mapping from Livescore names to database names
TEAM_MAP = {
    "South Korea": "Korea Republic",
    "Cote d'Ivoire": "Côte d'Ivoire",
    "Ivory Coast": "Côte d'Ivoire",
    "Congo DR": "DR Congo",
    "USA": "United States",
    "Cabo Verde": "Cape Verde",
    "Czech Republic": "Czechia"
}

def normalize_team(name):
    if not name:
        return ""
    name_strip = name.strip()
    return TEAM_MAP.get(name_strip, name_strip)

def fetch_livescore_matches():
    urls = [
        'https://www.livescore.com/en/football/international/world-cup-2026/',
        'https://www.livescore.com/en/football/international/world-cup-2026/fixtures/',
        'https://www.livescore.com/en/football/international/world-cup-2026/results/'
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
    }
    
    matches_found = []
    seen_keys = set()
    
    for url in urls:
        try:
            print(f"Scraping Livescore page: {url}")
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code != 200:
                print(f"Failed to fetch {url}: Status {res.status_code}")
                continue
            
            # Find __NEXT_DATA__
            match = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', res.text, re.DOTALL)
            if not match:
                print("Could not find __NEXT_DATA__ script tag.")
                continue
                
            data = json.loads(match.group(1))
            props = data.get('props') or {}
            page_props = props.get('pageProps') or {}
            initial_data = page_props.get('initialData') or {}
            sections = initial_data.get('sections') or []
            
            for sec in sections:
                if not sec:
                    continue
                events = sec.get('events') or []
                for ev in events:
                    if not ev:
                        continue
                    home = ev.get('homeTeamName')
                    away = ev.get('awayTeamName')
                    
                    if not home or not away:
                        continue
                        
                    home_norm = normalize_team(home)
                    away_norm = normalize_team(away)
                    
                    # Status
                    status_raw = ev.get('eventStatus') # 'UPCOMING', 'FT', 'IN_PLAY' etc.
                    
                    # Score after 90 mins (Full Time score)
                    home_score_raw = ev.get('homeFullTimeScore')
                    away_score_raw = ev.get('awayFullTimeScore')
                    
                    # If FT and FullTimeScore is empty, fallback to homeTeamScore
                    if status_raw == 'FT':
                        if home_score_raw == '' or home_score_raw is None:
                            home_score_raw = ev.get('homeTeamScore')
                        if away_score_raw == '' or away_score_raw is None:
                            away_score_raw = ev.get('awayTeamScore')
                            
                    # Parse scores as integers if available
                    home_score = None
                    away_score = None
                    try:
                        if home_score_raw is not None and home_score_raw != '':
                            home_score = int(home_score_raw)
                        if away_score_raw is not None and away_score_raw != '':
                            away_score = int(away_score_raw)
                    except ValueError:
                        pass
                        
                    # Map Livescore status to database status
                    db_status = 'SCHEDULED'
                    if status_raw == 'FT':
                        db_status = 'FT'
                    elif status_raw in ['IN_PLAY', 'HT', 'LIVE']:
                        db_status = 'LIVE'
                        
                    key = (home_norm, away_norm)
                    if key not in seen_keys:
                        seen_keys.add(key)
                        matches_found.append({
                            'home': home_norm,
                            'away': away_norm,
                            'score_a': home_score,
                            'score_b': away_score,
                            'status': db_status
                        })
                        
        except Exception as e:
            print(f"Error scraping {url}: {e}")
            
    return matches_found

def get_db_matches(supabase_url, supabase_key):
    url = f"{supabase_url}/rest/v1/matches?select=id,team_a,team_b,status"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}"
    }
    
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        return res.json()
    else:
        print(f"Error fetching DB matches: {res.text}")
        return []

def update_db_match(supabase_url, supabase_key, match_id, score_a, score_b, status):
    url = f"{supabase_url}/rest/v1/matches?id=eq.{match_id}"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    body = {
        "score_a": score_a,
        "score_b": score_b,
        "status": status
    }
    
    # PostgREST patch request
    res = requests.patch(url, headers=headers, json=body)
    if res.status_code in [200, 204]:
        print(f"Successfully updated match {match_id}: {score_a} - {score_b} ({status})")
        return True
    else:
        print(f"Failed to update match {match_id}: {res.text}")
        return False

def main():
    # Read environment variables for Supabase
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_KEY environment variables must be set.")
        print("Scraper will run in mock/test mode.")
        # Mock run
        ls_matches = fetch_livescore_matches()
        print(f"Mock run complete. Found {len(ls_matches)} matches in Livescore.")
        if ls_matches:
            print("First 3 matched events:")
            for m in ls_matches[:3]:
                print(f"  {m['home']} vs {m['away']} | Score: {m['score_a']}-{m['score_b']} | Status: {m['status']}")
        return
        
    print("Fetching active matches from database...")
    db_matches = get_db_matches(supabase_url, supabase_key)
    if not db_matches:
        print("No matches returned from database. Check schema and seed data.")
        return
        
    print("Scraping match data from Livescore...")
    ls_matches = fetch_livescore_matches()
    print(f"Found {len(ls_matches)} matches from Livescore.")
    
    # Match and update
    updates_count = 0
    for ls_m in ls_matches:
        # Search for this match in database matches
        # Note: sometimes teams could be flipped in DB or Livescore, so we check both combinations
        matched_db = None
        for db_m in db_matches:
            db_team_a = normalize_team(db_m['team_a'])
            db_team_b = normalize_team(db_m['team_b'])
            
            if (db_team_a == ls_m['home'] and db_team_b == ls_m['away']) or \
               (db_team_a == ls_m['away'] and db_team_b == ls_m['home']):
                matched_db = db_m
                break
                
        if matched_db:
            match_id = matched_db['id']
            db_status = matched_db['status']
            
            # Check if there is an update
            # We update if:
            # 1. Status is different (e.g. SCHEDULED -> LIVE or LIVE -> FT)
            # 2. Scores are updated
            is_updated = False
            
            # Handle score team flipping
            score_a = ls_m['score_a']
            score_b = ls_m['score_b']
            # If teams are flipped in Livescore relative to DB, we flip the scores
            if normalize_team(matched_db['team_a']) == ls_m['away']:
                score_a = ls_m['score_b']
                score_b = ls_m['score_a']
                
            if db_status != ls_m['status']:
                is_updated = True
            elif score_a is not None and score_b is not None:
                # If match is FT or LIVE, and scores are present
                is_updated = True
                
            if is_updated and ls_m['status'] != 'SCHEDULED':
                # Update match in Supabase
                success = update_db_match(supabase_url, supabase_key, match_id, score_a, score_b, ls_m['status'])
                if success:
                    updates_count += 1
                    
    print(f"Scraper run complete. Updated {updates_count} matches.")

if __name__ == '__main__':
    main()
