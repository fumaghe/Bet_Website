import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from datetime import datetime

# Define base URLs and league names
leagues = {
    "Premier League": ("https://fbref.com/en/comps/9", "Premier-League"),
    "Champions League": ("https://fbref.com/en/comps/8", "Champions-League"),
    "La Liga": ("https://fbref.com/en/comps/12", "La-Liga"),
    "Bundesliga": ("https://fbref.com/en/comps/20", "Bundesliga"),
    "Serie A": ("https://fbref.com/en/comps/11", "Serie-A"),
    "Ligue 1": ("https://fbref.com/en/comps/13", "Ligue-1"),
}

# Function to parse the match data from the table rows
def parse_match_data(row, league_name):
    if "thead" in row.get("class", []) or "spacer" in row.get("class", []):
        return None

    columns = row.find_all("td")
    if not columns:
        return None

    try:
        # Extract basic match details
        data = columns[1].find("a").text.strip() if len(columns) > 1 and columns[1].find("a") else ""
        ora = ""
        if len(columns) > 2:
            time_cell = columns[2]
            local_time_span = time_cell.find("span", class_="localtime")
            venuetime_span = time_cell.find("span", class_="venuetime")
            if local_time_span and local_time_span.text.strip():
                ora = local_time_span.text.strip()
            elif venuetime_span:
                ora = venuetime_span.text.strip()

        casa = columns[3].find("a").text.strip() if len(columns) > 3 and columns[3].find("a") else "-"
        trasferta = columns[7].find("a").text.strip() if len(columns) > 7 and columns[7].find("a") else "-"

        # Ensure we have valid data
        if not data or casa == "-" or trasferta == "-":
            return None

        return [casa, trasferta, ora, data, league_name]
    except Exception as e:
        print(f"Error parsing row: {e}")
        return None

# Function to download and parse matches for the current season
def download_matches(base_url, league_name, league_code):
    all_matches = []
    url = f"{base_url}/schedule/{league_name}-Scores-and-Fixtures"  # Current season (2024-2025)
    session = requests.Session()
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:114.0) Gecko/20100101 Firefox/114.0",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://fbref.com/",
        "Connection": "keep-alive",
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1",
    }
    print(f"Fetching data from: {url}")
    try:
        response = session.get(url, headers=headers)
        if response.status_code == 429:
            print("Rate limited: Waiting 120 seconds...")
            time.sleep(120)
            response = session.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Failed to retrieve {url} with status code {response.status_code}")
            return all_matches
        soup = BeautifulSoup(response.content, "html.parser")
        table_id = f"sched_2024-2025_{league_code}_1"
        table = soup.find("table", {"id": table_id})
        if not table:
            print(f"Table not found for {url} (table_id: {table_id})")
            return all_matches
        rows = table.find("tbody").find_all("tr")
        for row in rows:
            match_data = parse_match_data(row, league_name)
            if match_data:
                all_matches.append(match_data)
        time.sleep(10)
    except Exception as e:
        print(f"Error fetching data from {url}: {e}")
    return all_matches

# Function to format league names
def format_league_name(league_name):
    return league_name.replace("-", " ")

# Main loop to gather data for all leagues
columns = ["Squadra Casa", "Squadra Trasferta", "Orario", "Giorno", "Campionato"]
all_league_data = []
for league, (base_url, league_name) in leagues.items():
    league_code = base_url.split("/")[-1]
    formatted_league_name = format_league_name(league_name)  # Correct league name
    print(f"Downloading data for {formatted_league_name}...")
    league_matches = download_matches(base_url, league_name, league_code)
    # Update the league name in match data
    for match in league_matches:
        match[-1] = formatted_league_name  # Replace league name with formatted name
    all_league_data.extend(league_matches)

# Convert to DataFrame
df = pd.DataFrame(all_league_data, columns=columns)


# Adjust time format (increment by 1 hour if necessary)
def increment_time(time_str):
    try:
        if time_str:
            time_obj = datetime.strptime(time_str, "%H:%M")
            return time_obj.strftime("%H:%M")
    except ValueError:
        return time_str
    return time_str

df["Orario"] = df["Orario"].apply(increment_time)

# Save to CSV
df.to_csv("public/data/players/matches.csv", index=False)
print("Data saved to current_season_matches.csv")
