import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from datetime import datetime, timedelta

# Define base URLs and league names
leagues = {
    "Premier League": ("https://fbref.com/en/comps/9", "Premier-League"),
    "Champions League": ("https://fbref.com/en/comps/8", "Champions-League"),
    "La Liga": ("https://fbref.com/en/comps/12", "La-Liga"),
    "Bundesliga": ("https://fbref.com/en/comps/20", "Bundesliga"),
    "Serie A": ("https://fbref.com/en/comps/11", "Serie-A"),
    "Ligue 1": ("https://fbref.com/en/comps/13", "Ligue-1"),
}

# Helper function to generate the correct season URLs
def get_season_urls(base_url, league_name):
    urls = []
    for year in range(2020, 2025):
        if year < 2024:
            season_str = f"{year}-{year + 1}"
            urls.append(f"{base_url}/{season_str}/schedule/{season_str}-{league_name}-Scores-and-Fixtures")
        else:  # Current season (2024-2025)
            urls.append(f"{base_url}/schedule/{league_name}-Scores-and-Fixtures")
    return urls

# Helper function to parse the match data from the table rows
def parse_match_data(row, league_name):
    # Skip header rows and spacer rows
    if "thead" in row.get("class", []) or "spacer" in row.get("class", []):
        return None

    columns = row.find_all("td")
    if not columns:
        return None  # Skip rows without data

    try:
        sett = row.find("th", {"data-stat": "gameweek"}).text.strip() if row.find("th", {"data-stat": "gameweek"}) else ""
        data = columns[1].find("a").text.strip() if len(columns) > 1 and columns[1].find("a") else ""  # Extract full date (YYYY-MM-DD)

        # Extract time, fallback to venuetime if localtime is missing
        ora = ""
        if len(columns) > 2:
            time_cell = columns[2]
            local_time_span = time_cell.find("span", class_="localtime")
            venuetime_span = time_cell.find("span", class_="venuetime")
            
            if local_time_span and local_time_span.text.strip():
                ora = local_time_span.text.strip().replace("(", "").replace(")", "")
            elif venuetime_span:
                ora = venuetime_span.text.strip()

        casa = columns[3].find("a").text.strip() if len(columns) > 3 and columns[3].find("a") else "-"
        xg_casa = columns[4].text.strip() if len(columns) > 4 else "-"
        punteggio = columns[5].find("a").text.strip() if len(columns) > 5 and columns[5].find("a") else "-"
        gol_casa, gol_trasferta = "-", "-"
        if "–" in punteggio:
            gol_casa, gol_trasferta = punteggio.split("–")
        xg_trasferta = columns[6].text.strip() if len(columns) > 6 else "-"
        trasferta = columns[7].find("a").text.strip() if len(columns) > 7 and columns[7].find("a") else "-"
        return [casa, trasferta, ora, data, league_name, xg_casa, gol_casa, gol_trasferta, xg_trasferta, sett]
    except Exception as e:
        print(f"Error parsing row: {e}")
        return None

# Function to download and parse matches for a specific league and season
def download_matches(base_url, league_name, league_code):
    all_matches = []
    season_urls = get_season_urls(base_url, league_name)
    session = requests.Session()  # Persistent session
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:114.0) Gecko/20100101 Firefox/114.0",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://fbref.com/",
        "Connection": "keep-alive",
        "DNT": "1",  # Do Not Track enabled
        "Upgrade-Insecure-Requests": "1",
    }
    for url in season_urls:
        season = url.split("/")[-3] if "schedule" in url and "-" in url.split("/")[-3] else "2024-2025"  # Handle current season
        print(f"Fetching data from: {url}")
        try:
            response = session.get(url, headers=headers)
            if response.status_code == 429:
                print(f"Rate limited: Waiting 120 seconds...")
                time.sleep(120)  # Wait and retry
                response = session.get(url, headers=headers)
            if response.status_code != 200:
                print(f"Failed to retrieve {url} with status code {response.status_code}")
                continue
            soup = BeautifulSoup(response.content, "html.parser")
            table_id = f"sched_{season}_{league_code}_1"  # Correct table ID format
            table = soup.find("table", {"id": table_id})
            if not table:
                print(f"Table not found for {url} (table_id: {table_id})")
                continue
            rows = table.find("tbody").find_all("tr")
            for row in rows:
                match_data = parse_match_data(row, league_name)
                if match_data:
                    all_matches.append(match_data)
            time.sleep(10)  # Rate limiting: wait 10 seconds between requests
        except Exception as e:
            print(f"Error fetching data from {url}: {e}")
            continue
    return all_matches

# Main loop to gather data for all leagues
columns = [
    "Squadra Casa", "Squadra Trasferta", "Orario", "Giorno", "Campionato",
    "xG Casa", "Gol Casa", "Gol Trasferta", "xG Trasferta", "Sett."
]
all_league_data = []
for league, (base_url, league_name) in leagues.items():
    league_code = base_url.split("/")[-1]
    print(f"Downloading data for {league}...")
    league_matches = download_matches(base_url, league_name, league_code)
    all_league_data.extend(league_matches)

# Convert to DataFrame
df = pd.DataFrame(all_league_data, columns=columns)

# Increment the time by 1 hour for each match
def increment_time(time_str):
    try:
        if time_str:
            time_obj = datetime.strptime(time_str, "%H:%M")
            return time_obj.strftime("%H:%M")
    except ValueError:
        return time_str  # Return original time if it fails to parse
    return time_str

df["Orario"] = df["Orario"].apply(increment_time)

# Rimuovere righe vuote o con valori placeholder
df = df.dropna(how="all")  # Rimuove righe completamente vuote
df = df[~((df["Orario"] == "") | (df["Squadra Casa"] == "-") | (df["Gol Casa"] == "-") | (df["Gol Trasferta"] == "-"))]

# Salva il CSV
df.to_csv("public/data/all_leagues_matches.csv", index=False)
print("Data saved to all_leagues_matches.csv")
