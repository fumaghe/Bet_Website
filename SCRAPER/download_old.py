import re
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from datetime import datetime, timedelta

# Leghe da scaricare
leagues = {
    "Premier League": ("https://fbref.com/en/comps/9", "Premier-League"),
    "Champions League": ("https://fbref.com/en/comps/8", "Champions-League"),
    "La Liga": ("https://fbref.com/en/comps/12", "La-Liga"),
    "Bundesliga": ("https://fbref.com/en/comps/20", "Bundesliga"),
    "Serie A": ("https://fbref.com/en/comps/11", "Serie-A"),
    "Ligue 1": ("https://fbref.com/en/comps/13", "Ligue-1"),
}


# Se vuoi aggiungere codici di altri paesi, inseriscili qui
COUNTRY_CODES = {
    "it", "ch", "eng", "fr", "de", "nl", "pt", "es", "ua", "rs",
    "cz", "sk", "hr", "sct", "be", "at",
}

def remove_country_code(team_name: str) -> str:
    """
    Rimuove eventuali codici paese di 2-3 lettere all'inizio o alla fine
    (es. "Milanit" -> "Milan", "Paris S-Gfr" -> "Paris S-G",
         "Young Boysch" -> "Young Boys", "engAston Villa" -> "Aston Villa").
    """
    name = team_name.strip()
    if not name:
        return name

    # Rimuove prefisso se matcha
    for code in COUNTRY_CODES:
        if name.startswith(code):
            name = name[len(code):].strip()
            break  # Rimuove solo il primo match

    # Rimuove suffisso se matcha
    for code in COUNTRY_CODES:
        if name.endswith(code):
            name = name[:-len(code)].strip()
            break  # Rimuove solo il primo match

    return name

def get_season_urls(base_url, league_name):
    """
    Costruisce la lista di URL per le stagioni 2023-2024 e 2024-2025.
    """
    urls = []
    for year in range(2018, 2025):
        if year < 2024:
            season_str = f"{year}-{year + 1}"  # es: "2023-2024"
            urls.append(f"{base_url}/{season_str}/schedule/{season_str}-{league_name}-Scores-and-Fixtures")
        else:
            # stagione corrente 2024-2025
            urls.append(f"{base_url}/schedule/{league_name}-Scores-and-Fixtures")
    return urls

def parse_match_row(tr, league_name):
    """
    Parsa un singolo <tr> con data-stat specifici:
      - date (giorno)
      - start_time (orario)
      - home_team (squadra casa)
      - home_xg (xG casa)
      - score (gol casa–gol trasf)
      - away_xg (xG trasf)
      - away_team (squadra trasf)
      - gameweek (sett)
    """
    # Salta righe di header/spacer
    if "thead" in tr.get("class", []) or "spacer" in tr.get("class", []):
        return None

    tds = tr.find_all("td")
    if not tds:
        return None

    # Trova il "matchweek" in <th data-stat="gameweek">
    matchweek_th = tr.find("th", {"data-stat": "gameweek"})
    sett = matchweek_th.get_text(strip=True) if matchweek_th else ""

    # Estraggo le celle in base a data-stat (più robusto che usare indici)
    date_td       = tr.find("td", {"data-stat": "date"})
    time_td       = tr.find("td", {"data-stat": "start_time"})
    home_td       = tr.find("td", {"data-stat": "home_team"})
    home_xg_td    = tr.find("td", {"data-stat": "home_xg"})
    score_td      = tr.find("td", {"data-stat": "score"})
    away_xg_td    = tr.find("td", {"data-stat": "away_xg"})
    away_td       = tr.find("td", {"data-stat": "away_team"})

    # Se mancano i campi essenziali, scarta
    if not (date_td and time_td and home_td and score_td and away_td):
        return None

    giorno    = date_td.get_text(strip=True)  
    orario    = time_td.get_text(strip=True)
    casa_raw  = home_td.get_text(strip=True)
    xg_casa   = home_xg_td.get_text(strip=True) if home_xg_td else ""
    punteggio = score_td.get_text(strip=True)
    xg_trasf  = away_xg_td.get_text(strip=True) if away_xg_td else ""
    trasf_raw = away_td.get_text(strip=True)

    # Rimuovo eventuali codici nazione
    casa   = remove_country_code(casa_raw)
    trasf  = remove_country_code(trasf_raw)

    # Splitta gol casa e trasf da punteggio (es. "2–1")
    gol_casa, gol_trasferta = "", ""
    if "–" in punteggio:
        parts = punteggio.split("–", 1)
        if len(parts) == 2:
            gol_casa, gol_trasferta = parts

    return [
        casa,               # Squadra Casa
        trasf,              # Squadra Trasferta
        orario,             # Orario
        giorno,             # Giorno
        league_name,        # Campionato
        xg_casa,            # xG Casa
        gol_casa,           # Gol Casa
        gol_trasferta,      # Gol Trasferta
        xg_trasf,           # xG Trasferta
        sett                # Sett
    ]

def download_matches(base_url, league_name, league_code):
    """
    Scarica e parsa le tabelle.
    Per la Champions, usa sched_all. Per le altre leghe, sched_{season}_{league_code}_1.
    """
    all_matches = []
    urls = get_season_urls(base_url, league_name)
    session = requests.Session()

    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Referer": "https://fbref.com/",
        "Connection": "keep-alive",
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1",
    }

    for url in urls:
        parts = url.split("/")
        if "schedule" in url and "-" in parts[-3]:
            season = parts[-3]  # es "2023-2024"
        else:
            season = "2024-2025"

        print(f"\n[INFO] Downloading {url}  (season={season})")

        try:
            resp = session.get(url, headers=headers)
            if resp.status_code == 429:
                print("[WARN] Rate-limited, wait 120s ...")
                time.sleep(120)
                resp = session.get(url, headers=headers)

            if resp.status_code != 200:
                print(f"[WARN] {url} => HTTP {resp.status_code}")
                continue

            soup = BeautifulSoup(resp.content, "html.parser")

            # Champions => "sched_all", altrimenti sched_{season}_{league_code}_1
            if league_name == "Champions-League":
                table_id = "sched_all"
            else:
                table_id = f"sched_{season}_{league_code}_1"

            table = soup.find("table", {"id": table_id})
            if not table:
                print(f"[WARN] Table {table_id} not found in {url}")
                continue

            rows = table.find("tbody").find_all("tr", recursive=False)
            print(f"[INFO] Found {len(rows)} rows in table {table_id}")

            valid = 0
            for tr in rows:
                match_info = parse_match_row(tr, league_name)
                if match_info:
                    all_matches.append(match_info)
                    valid += 1

            print(f"[INFO] Valid matches extracted: {valid}")
            time.sleep(5)
        except Exception as ex:
            print(f"[ERROR] {url}: {ex}")
            continue

    return all_matches

# Colonne finali
cols = [
    "Squadra Casa","Squadra Trasferta","Orario","Giorno","Campionato",
    "xG Casa","Gol Casa","Gol Trasferta","xG Trasferta","Sett."
]
all_data = []

for league, (base_url, league_name) in leagues.items():
    code = base_url.split("/")[-1]
    print(f"\n=== Scarico dati per {league} (code={code}) ===")
    matches = download_matches(base_url, league_name, code)
    all_data.extend(matches)

df = pd.DataFrame(all_data, columns=cols)

def fix_time(t):
    """
    Se vuoi aggiungere +1 ora, decommenta.
    """
    try:
        if t:
            parsed = datetime.strptime(t, "%H:%M")
            # parsed += timedelta(hours=1)
            return parsed.strftime("%H:%M")
    except:
        pass
    return t

df["Orario"] = df["Orario"].apply(fix_time)

# Se vuoi TENERE TUTTE le gare (anche future), lascia così.
# Se vuoi SOLO partite con risultato (Gol Casa != "-"), filtra:
# df = df[~( (df["Gol Casa"]=="-") | (df["Gol Trasferta"]=="-") )]

# Salva il CSV
df.to_csv("public/data/all_leagues_matches.csv", index=False)
print("Data saved to all_leagues_matches.csv")
