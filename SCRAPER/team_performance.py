# coding: utf-8
"""
FBref Big5 (team FOR) → team_performance.csv
- Anti-403 con cloudscraper (UA rotation, retry/backoff, Retry-After, CF detection)
- Ricerca tabelle anche dentro <!-- ... -->
- Rinomina e ordine colonne al formato richiesto:

Pos.,Squadra,Competizione,N. di giocatori,Età,Poss.,PG,Tit,Min,90 min,
Reti,Assist,G+A,R - Rig,Rigori,Rig T,Amm.,Esp.,xG,npxG,xAG,npxG+xAG,
PrgC,PrgP,Falli commessi,Falli subiti,Fuorigioco
"""

import random
import time
import pandas as pd
from bs4 import BeautifulSoup, Comment
from requests.exceptions import HTTPError
import cloudscraper

# ───────────────────────────────────────────────────
# Anti-403: cloudscraper setup
# ───────────────────────────────────────────────────
BASE_URL = "https://fbref.com"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1",
]

_CF_MARKERS = (
    "Just a moment", "Attention Required",
    "/cdn-cgi/challenge-platform", "cf-browser-verification"
)

def new_scraper() -> cloudscraper.CloudScraper:
    ua = random.choice(USER_AGENTS)
    s = cloudscraper.create_scraper(browser={"custom": ua}, interpreter="nodejs")
    s.headers.update({
        "User-Agent": ua,
        "Accept-Language": random.choice(["it-IT,it;q=0.9,en-US;q=0.8","en-US,en;q=0.9"]),
        "Referer": BASE_URL,
        "Cache-Control": "no-cache",
    })
    return s

SCRAPER = new_scraper()

def _looks_blocked(html: str) -> bool:
    if not html:
        return False
    return any(m in html[:6000] for m in _CF_MARKERS)

def fetch(url: str, timeout=25, retries=10, backoff=1.8, jitter=0.35) -> str:
    """
    GET resiliente con UA rotation + rispetto Retry-After + CF challenge detection.
    """
    global SCRAPER
    delay = 1.2
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            r = SCRAPER.get(url, timeout=timeout)
            st = r.status_code

            if st == 200 and not _looks_blocked(r.text):
                return r.text

            if st in (403, 429, 503) or _looks_blocked(r.text):
                ra = r.headers.get("Retry-After")
                wait = float(ra) if ra and str(ra).isdigit() else delay
                wait += random.uniform(0, wait * jitter)
                if attempt % 3 == 0 or _looks_blocked(r.text):
                    SCRAPER = new_scraper()
                time.sleep(wait)
                delay *= backoff
                continue

            if 500 <= st < 600:
                time.sleep(delay + random.uniform(0, delay * jitter))
                delay *= backoff
                continue

            r.raise_for_status()

        except Exception as e:
            last_exc = e
            if attempt % 3 == 0:
                SCRAPER = new_scraper()
            time.sleep(delay + random.uniform(0, delay * jitter))
            delay *= backoff
            continue

    raise HTTPError(f"Unable to fetch {url} after {retries} retries; last error: {last_exc}")

def polite_delay():
    time.sleep(random.uniform(1.0, 2.0))

# ───────────────────────────────────────────────────
# Parsing helpers
# ───────────────────────────────────────────────────
def find_table(soup: BeautifulSoup, table_id: str):
    t = soup.find('table', id=table_id)
    if t:
        return t
    # prova anche dentro i commenti
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment_soup = BeautifulSoup(comment, 'lxml')
        t = comment_soup.find('table', id=table_id)
        if t:
            print(f"Found table with ID '{table_id}' within comments.")
            return t
    return None

def normalize_numeric_str(s: str) -> str:
    # sostituisce virgola con punto per i decimali e rimuove virgolette
    return (s or "").replace('"', '').replace(',', '.')

# ───────────────────────────────────────────────────
# Funzioni di scraping tabella
# ───────────────────────────────────────────────────
def fetch_table(url, table_id):
    """
    Tabella 'complessa': usa la 2ª riga del thead come intestazione,
    e tronca le colonne fino a 'PrgP' se presente. Cerca anche nei commenti.
    """
    html = fetch(url)
    soup = BeautifulSoup(html, 'lxml')

    table = find_table(soup, table_id)
    if not table:
        raise ValueError(f"Tabella con ID '{table_id}' non trovata.")

    thead = table.find('thead')
    header_rows = thead.find_all('tr') if thead else []
    if len(header_rows) < 2:
        raise ValueError(f"Non ci sono abbastanza righe di intestazione nella tabella con ID '{table_id}'.")
    header_tr = header_rows[1]
    headers = [th.get_text(strip=True) for th in header_tr.find_all('th')]

    # tronca fino a "PrgP" se esiste
    try:
        stop_index = headers.index("PrgP") + 1
    except ValueError:
        stop_index = len(headers)
    headers = headers[:stop_index]

    rows = []
    tbody = table.find('tbody')
    for tr in (tbody.find_all('tr') if tbody else []):
        if tr.find('th', {"scope": "row"}) is None:
            continue
        cells = tr.find_all(['th', 'td'])
        row = []
        for cell in cells[:stop_index]:
            if cell.find('a'):
                text = cell.find('a').get_text(strip=True)
            elif cell.find('img'):
                text = cell.find('img').get('alt', '').strip()
            else:
                text = cell.get_text(strip=True)
            row.append(text)
        if row:
            rows.append(row)

    df = pd.DataFrame(rows, columns=headers)

    # Pulizia dei dati
    for col in df.columns:
        df[col] = df[col].astype(str).apply(normalize_numeric_str)

    # fix competizione (cosmetico)
    if 'Competizione' in df.columns:
        df['Competizione'] = df['Competizione'].str.replace(' Premier League', 'Premier League', regex=False)

    # allinea 'Squadra' se lo header è 'Squad'
    if 'Squadra' not in df.columns and 'Squad' in df.columns:
        df.rename(columns={'Squad': 'Squadra'}, inplace=True)

    return df

def fetch_misc_table(url, table_id, columns_to_extract, column_mapping):
    """
    Tabella 'semplice': raccoglie celle per data-stat richieste.
    Cerca la tabella anche nei commenti. Include soltanto righe complete.
    """
    html = fetch(url)
    soup = BeautifulSoup(html, 'lxml')

    table = find_table(soup, table_id)
    if not table:
        raise ValueError(f"Tabella con ID '{table_id}' non trovata.")

    data_stats = set()
    for tr in table.find('tbody').find_all('tr'):
        for cell in tr.find_all(['th', 'td']):
            ds = cell.get('data-stat')
            if ds:
                data_stats.add(ds)

    missing_stats = [stat for stat in columns_to_extract if stat not in data_stats]
    if missing_stats:
        print(f"Warning: The following data-stat keys are missing: {', '.join(missing_stats)}")

    rows = []
    for tr in table.find('tbody').find_all('tr'):
        cells = tr.find_all(['th', 'td'])
        row_data = {}
        for cell in cells:
            ds = cell.get('data-stat')
            if ds in columns_to_extract:
                row_data[ds] = cell.get_text(strip=True)
        if all(ds in row_data for ds in columns_to_extract):
            row = {column_mapping[ds]: row_data[ds] for ds in columns_to_extract}
            rows.append(row)

    df = pd.DataFrame(rows)

    # Pulizia dei dati
    for col in df.columns:
        df[col] = df[col].astype(str).apply(normalize_numeric_str)

    return df

# ───────────────────────────────────────────────────
# Mapping colonne → formato finale
# ───────────────────────────────────────────────────
COL_RENAME = {
    "Rk": "Pos.",
    "Squad": "Squadra", "Squadra": "Squadra",
    "Comp": "Competizione", "Competizione": "Competizione",
    "# Pl": "N. di giocatori",
    "Age": "Età",
    "Poss": "Poss.", "Poss%": "Poss.",
    "MP": "PG",
    "Starts": "Tit",
    "Min": "Min",
    "90s": "90 min",
    "Gls": "Reti",
    "Ast": "Assist",
    "G+A": "G+A",
    "G-PK": "R - Rig",
    "PK": "Rigori",
    "PKatt": "Rig T",
    "CrdY": "Amm.",
    "CrdR": "Esp.",
    "xG": "xG",
    "npxG": "npxG",
    "xAG": "xAG",
    "npxG+xAG": "npxG+xAG",
    "PrgC": "PrgC",
    "PrgP": "PrgP",
    # misc già in italiano:
    "Falli commessi": "Falli commessi",
    "Falli subiti": "Falli subiti",
    "Fuorigioco": "Fuorigioco",
}

FINAL_ORDER = [
    "Pos.","Squadra","Competizione","N. di giocatori","Età","Poss.","PG","Tit","Min","90 min",
    "Reti","Assist","G+A","R - Rig","Rigori","Rig T","Amm.","Esp.","xG","npxG","xAG","npxG+xAG",
    "PrgC","PrgP","Falli commessi","Falli subiti","Fuorigioco"
]

def ensure_col(df: pd.DataFrame, col: str):
    if col not in df.columns:
        df[col] = ""

# ───────────────────────────────────────────────────
# MAIN
# ───────────────────────────────────────────────────
def main():
    try:
        # URLs e ID (Big5 squadre "for")
        url_standard = "https://fbref.com/it/comp/Big5/stats/squadre/Statistiche-di-I-5-campionati-europei-piu-importanti"
        table_id_standard = "stats_teams_standard_for"

        url_misc = "https://fbref.com/it/comp/Big5/misc/squadre/Statistiche-di-I-5-campionati-europei-piu-importanti"
        table_id_misc = "stats_teams_misc_for"

        # Scarica tabelle
        df_standard = fetch_table(url_standard, table_id_standard)
        polite_delay()

        # data-stat da estrarre e mapping intestazioni
        columns_to_extract = ["team", "fouls", "fouled", "offsides"]
        column_mapping = {
            "team": "Squadra",
            "fouls": "Falli commessi",
            "fouled": "Falli subiti",
            "offsides": "Fuorigioco"
        }
        df_misc = fetch_misc_table(url_misc, table_id_misc, columns_to_extract, column_mapping)

        # assicurati che 'Squadra' esista in df_standard
        if "Squadra" not in df_standard.columns and "Squad" in df_standard.columns:
            df_standard.rename(columns={"Squad": "Squadra"}, inplace=True)

        # Merge
        merged_df = pd.merge(df_standard, df_misc, on="Squadra", how="inner")

        # Rinomina colonne al formato finale
        merged_df.rename(columns=COL_RENAME, inplace=True)

        # Garantisci tutte le colonne finali
        for c in FINAL_ORDER:
            ensure_col(merged_df, c)

        # Ordina colonne
        merged_df = merged_df[FINAL_ORDER]

        # Salva
        out_path = "public/data/team_performance.csv"
        merged_df.to_csv(out_path, index=False, encoding='utf-8-sig')
        print("✅ team_performance.csv creato con intestazioni e ordine corretti.")

    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    main()
