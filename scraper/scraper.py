import os
import requests
import sys

# Team name mapping from API names to our database names
TEAM_MAP = {
    "South Korea": "Korea Republic",
    "Cote d'Ivoire": "Côte d'Ivoire",
    "Ivory Coast": "Côte d'Ivoire",
    "Congo DR": "DR Congo",
    "USA": "United States",
    "Cabo Verde": "Cape Verde",
    "Czech Republic": "Czechia",
    "Czechia": "Czechia"
}

def normalize_team(name):
    if not name:
        return ""
    name_strip = name.strip()
    return TEAM_MAP.get(name_strip, name_strip)

def fetch_football_data_matches(api_token):
    url = "https://api.football-data.org/v4/competitions/WC/matches"
    headers = {
        "X-Auth-Token": api_token
    }
    
    try:
        print(f"Fetching matches from Football-Data.org API...")
        res = requests.get(url, headers=headers, timeout=15)
        if res.status_code != 200:
            print(f"Failed to fetch matches: Status {res.status_code}. Response: {res.text}")
            return []
            
        data = res.json()
        matches_found = []
        
        for m in data.get("matches", []):
            home_team = m.get("homeTeam", {})
            away_team = m.get("awayTeam", {})
            
            home_name = home_team.get("name")
            away_name = away_team.get("name")
            
            if not home_name or not away_name:
                continue
                
            home_norm = normalize_team(home_name)
            away_norm = normalize_team(away_name)
            
            # Match status mapping
            # API statuses: 'TIMED', 'SCHEDULED', 'LIVE', 'IN_PLAY', 'PAUSED', 'FINISHED', 'POSTPONED', 'SUSPENDED', 'CANCELLED'
            api_status = m.get("status")
            db_status = "SCHEDULED"
            if api_status in ["FINISHED"]:
                db_status = "FT"
            elif api_status in ["LIVE", "IN_PLAY", "PAUSED"]:
                db_status = "LIVE"
                
            # Score
            score_data = m.get("score", {})
            full_time = score_data.get("fullTime", {})
            
            score_a = full_time.get("home")
            score_b = full_time.get("away")
            
            matches_found.append({
                "home": home_norm,
                "away": away_norm,
                "score_a": score_a,
                "score_b": score_b,
                "status": db_status
            })
            
        return matches_found
        
    except Exception as e:
        print(f"Error calling Football-Data.org API: {e}")
        return []

def get_db_matches(supabase_url, supabase_key):
    url = f"{supabase_url}/rest/v1/matches?select=id,team_a,team_b,status,score_a,score_b"
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
    api_token = os.environ.get("FOOTBALL_DATA_TOKEN")
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_KEY environment variables must be set.")
        return
        
    if not api_token:
        print("Error: FOOTBALL_DATA_TOKEN environment variable must be set.")
        print("Please register a free API token at: https://www.football-data.org/client/register")
        return
        
    print("Fetching active matches from database...")
    db_matches = get_db_matches(supabase_url, supabase_key)
    if not db_matches:
        print("No matches returned from database. Check schema and seed data.")
        return
        
    print("Fetching match data from Football-Data.org...")
    api_matches = fetch_football_data_matches(api_token)
    print(f"Found {len(api_matches)} matches from API.")
    
    # Match and update
    updates_count = 0
    for api_m in api_matches:
        matched_db = None
        for db_m in db_matches:
            db_team_a = normalize_team(db_m['team_a'])
            db_team_b = normalize_team(db_m['team_b'])
            
            # Match teams (checking both combinations in case they are flipped)
            if (db_team_a == api_m['home'] and db_team_b == api_m['away']) or \
               (db_team_a == api_m['away'] and db_team_b == api_m['home']):
                matched_db = db_m
                break
                
        if matched_db:
            match_id = matched_db['id']
            db_status = matched_db['status']
            db_score_a = matched_db.get('score_a')
            db_score_b = matched_db.get('score_b')
            
            score_a = api_m['score_a']
            score_b = api_m['score_b']
            
            # Flip scores if team order is flipped in DB relative to API
            if normalize_team(matched_db['team_a']) == api_m['away']:
                score_a = api_m['score_b']
                score_b = api_m['score_a']
                
            is_updated = False
            
            # Check if there are changes in status or scores
            if db_status != api_m['status']:
                is_updated = True
            elif score_a is not None and score_b is not None:
                if db_score_a != score_a or db_score_b != score_b:
                    is_updated = True
                    
            if is_updated and api_m['status'] != 'SCHEDULED':
                # Update match in Supabase
                success = update_db_match(supabase_url, supabase_key, match_id, score_a, score_b, api_m['status'])
                if success:
                    updates_count += 1
                    
    print(f"Scraper run complete. Updated {updates_count} matches.")

if __name__ == '__main__':
    main()
