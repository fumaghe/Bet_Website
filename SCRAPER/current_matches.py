import re
import requests
from bs4 import BeautifulSoup
import pandas as pd
import time
from datetime import datetime, timedelta

# Leghe da scaricare (qui solo Champions, eventualmente aggiungi le altre).
leagues = {
    "Premier League": ("https://fbref.com/en/comps/9", "Premier-League"),
    "Champions League": ("https://fbref.com/en/comps/8", "Champions-League"),
    "La Liga": ("https://fbref.com/en/comps/12", "La-Liga"),
    "Bundesliga": ("https://fbref.com/en/comps/20", "Bundesliga"),
    "Serie A": ("https://fbref.com/en/comps/11", "Serie-A"),
    "Ligue 1": ("https://fbref.com/en/comps/13", "Ligue-1"),
}

# Elenco codici paese che vogliamo rimuovere se compaiono come prefisso/suffisso
COUNTRY_CODES = {
    "hr", "it", "de", "sk", "eng", "es", "ch", "rs", "cz", "nl", "pt", "fr", "ua", "sct", "be", "at"
}

def remove_country_codes(team_name: str) -> str:
    """
    Rimuove un eventuale codice paese all'inizio o alla fine di team_name,
    usando l'elenco COUNTRY_CODES.
    
    Esempi:
      "engAston Villa" -> "Aston Villa"
      "Young Boysch"   -> "Young Boys"
      "Juventusit"     -> "Juventus"
      "PSV Eindhovennl"-> "PSV Eindhoven"
      "Celticsct"      -> "Celtic"
      "Bayern Munichde"-> "Bayern Munich"
    """
    name = team_name.strip()
    # Rimuove prefisso se corrisponde a uno dei codici
    for code in COUNTRY_CODES:
        if name.startswith(code):
            # taglia la lunghezza di 'code' dall'inizio
            name = name[len(code):]
            break  # rimuove solo il primo code, poi esce

    # Rimuove suffisso se corrisponde a uno dei codici
    for code in COUNTRY_CODES:
        if name.endswith(code):
            # taglia la lunghezza di 'code' dalla fine
            name = name[:-len(code)]
            break  # rimuove solo il primo code, poi esce

    return name.strip()

def parse_match_row(tr, league_name):
    """
    Dato un <tr> della tabella, estrae [casa, trasf, orario, data, campionato]
    usando gli attributi data-stat. Ritorna None se non è una riga di match valido.
    """
    if "thead" in tr.get("class", []) or "spacer" in tr.get("class", []):
        return None

    tds = tr.find_all("td")
    if not tds:
        return None

    date_td = tr.find("td", {"data-stat": "date"})
    time_td = tr.find("td", {"data-stat": "start_time"})
    home_td = tr.find("td", {"data-stat": "home_team"})
    away_td = tr.find("td", {"data-stat": "away_team"})

    if not (date_td and time_td and home_td and away_td):
        return None

    giorno = date_td.get_text(strip=True)   # es. "2024-09-17"
    orario = time_td.get_text(strip=True)   # es. "18:45"
    casa   = home_td.get_text(strip=True)   # es. "Young Boysch"
    trasf  = away_td.get_text(strip=True)   # es. "engAston Villa"

    # Rimuove i codici paese da casa e trasf
    casa_clean  = remove_country_codes(casa)
    trasf_clean = remove_country_codes(trasf)

    # Se mancano dati essenziali, scartiamo
    if not giorno or not casa_clean or not trasf_clean:
        return None

    return [casa_clean, trasf_clean, orario, giorno, league_name]

def download_matches(base_url, league_name, league_code):
    """
    Scarica la pagina 'Scores and Fixtures' per la lega desiderata,
    individua la tabella corretta e parsa le righe con parse_match_row().
    Ritorna una lista di partite [casa, trasf, orario, data, campionato].
    """
    if league_name == "Champions-League":
        table_id = "sched_all"  # Tab "All Rounds" per la Champions
    else:
        table_id = f"sched_2024-2025_{league_code}_1"

    url = f"{base_url}/schedule/{league_name}-Scores-and-Fixtures"
    print(f"Scarico da {url} (table_id={table_id})")

    headers = {
        "User-Agent": "Mozilla/5.0",
    }
    all_matches = []

    try:
        with requests.Session() as s:
            resp = s.get(url, headers=headers)
            if resp.status_code == 429:
                print("Rate-limited. Attendo 60 secondi...")
                time.sleep(60)
                resp = s.get(url, headers=headers)

            if resp.status_code != 200:
                print(f"HTTP {resp.status_code} - impossibile scaricare {url}")
                return all_matches

            soup = BeautifulSoup(resp.content, "html.parser")
            table = soup.find("table", {"id": table_id})
            if not table:
                print(f"Tabella con id={table_id} non trovata!")
                return all_matches

            rows = table.find("tbody").find_all("tr", recursive=False)
            for tr in rows:
                match_data = parse_match_row(tr, league_name)
                if match_data:
                    all_matches.append(match_data)

        # Pausa "di cortesia" per non stressare il server
        time.sleep(5)

    except Exception as e:
        print(f"Errore scaricando {url}: {e}")

    return all_matches

def format_league_name(league_name):
    """Esempio: "Champions-League" -> "Champions League"."""
    return league_name.replace("-", " ")

# Colonne finali
columns = ["Squadra Casa","Squadra Trasferta","Orario","Giorno","Campionato"]
all_data = []

# Per ogni lega definita in 'leagues'
for league, (base_url, league_name) in leagues.items():
    code = base_url.split("/")[-1]  # es. "8" per la Champions
    readable_name = format_league_name(league_name)

    print(f"==> Inizio download: {readable_name} <==")
    matches = download_matches(base_url, league_name, code)

    # Cambiamo il nome campionato nell'ultimo campo
    for m in matches:
        m[-1] = readable_name

    all_data.extend(matches)

# Costruiamo il DataFrame
df = pd.DataFrame(all_data, columns=columns)

# (Opzionale) Se vuoi shiftare l'orario di +1h, decommenta:
"""
def shift_time_1h(t):
    if not t:
        return t
    try:
        ts = datetime.strptime(t, "%H:%M")
        ts += timedelta(hours=1)
        return ts.strftime("%H:%M")
    except ValueError:
        return t

df["Orario"] = df["Orario"].apply(shift_time_1h)
"""

# Save to CSV
df.to_csv("public/data/players/matches_season.csv", index=False)
print("Data saved to current_season_matches.csv")
