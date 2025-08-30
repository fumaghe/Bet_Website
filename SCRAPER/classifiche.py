# coding: utf-8
"""
FBref → CSV classifiche (standings) per campionati top + Champions
- Anti-403 con cloudscraper (UA rotation, retry/backoff)
- Fallback IT → EN
- Parsing tabelle anche se annidate in commenti <!-- ... -->
- Normalizzazione colonne e salvataggio CSV in public/data/standings/<league>.csv

Python 3.12
"""

import os
import re
import time
import random
from typing import Dict, Optional

import pandas as pd
import cloudscraper
from bs4 import BeautifulSoup, Comment
from requests.exceptions import HTTPError

# ───────────────────────────────────────────────────
# CONFIG
# ───────────────────────────────────────────────────
OUTPUT_DIR = os.path.join("public", "data", "standings")
os.makedirs(OUTPUT_DIR, exist_ok=True)

leagues = [
    {
        'id': 'results2025-202682_overall',
        'url_it': 'https://fbref.com/it/comp/8/Statistiche-di-Champions-League',
        'url_en': 'https://fbref.com/en/comps/8/Champions-League-Stats',
        'league': 'champions_league'
    },
    {
        'id': 'results2025-202691_overall',
        'url_it': 'https://fbref.com/it/comp/9/Statistiche-di-Premier League',
        'url_en': 'https://fbref.com/en/comps/9/Premier League-Stats',
        'league': 'premier_league'
    },
    {
        'id': 'results2025-2026121_overall',
        'url_it': 'https://fbref.com/it/comp/12/Statistiche-di-La-Liga',
        'url_en': 'https://fbref.com/en/comps/12/La-Liga-Stats',
        'league': 'la_liga'
    },
    {
        'id': 'results2025-2026111_overall',
        'url_it': 'https://fbref.com/it/comp/11/Statistiche-di-Serie-A',
        'url_en': 'https://fbref.com/en/comps/11/Serie-A-Stats',
        'league': 'serie_a'
    },
    {
        'id': 'results2025-2026201_overall',
        'url_it': 'https://fbref.com/it/comp/20/Statistiche-di-Bundesliga',
        'url_en': 'https://fbref.com/en/comps/20/Bundesliga-Stats',
        'league': 'bundesliga'
    },
    {
        'id': 'results2025-2026131_overall',
        'url_it': 'https://fbref.com/it/comp/13/Statistiche-di-Ligue-1',
        'url_en': 'https://fbref.com/en/comps/13/Ligue-1-Stats',
        'league': 'ligue_1'
    }
]

# colonne possibili (IT/EN) → target
columns_needed = {
    'Pos': ['Rk.', 'Rk'],
    'Squadra': ['Squadra', 'Squad', 'Team'],
    'PG': ['PG', 'MP'],
    'V': ['V', 'W'],
    'N': ['N', 'D'],
    'P': ['P', 'L'],
    'Rf': ['Rf', 'GF'],
    'Rs': ['Rs', 'GA'],
    'DR': ['DR', 'GD'],
    'Pt': ['Pt', 'Pts'],
    'xG': ['xG'],
    'xGA': ['xGA']
}

# ───────────────────────────────────────────────────
# cloudscraper anti-403 (come il tuo)
# ───────────────────────────────────────────────────
BASE_URL = "https://fbref.com"

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
    "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile/15E148 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_7_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0",
    "Mozilla/5.0 (Windows NT 10.0; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_7_10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPad; CPU OS 16_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.0.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Windows NT 6.3; WOW64; rv:109.0) Gecko/20100101 Firefox/109.0",
]

_CF_BLOCK_MARKERS = (
    "Just a moment", "Attention Required", "/cdn-cgi/challenge-platform", "cf-browser-verification"
)

def new_scraper() -> cloudscraper.CloudScraper:
    ua = random.choice(USER_AGENTS)
    s = cloudscraper.create_scraper(browser={"custom": ua}, interpreter="nodejs")
    s.headers.update({
        "User-Agent": ua,
        "Accept-Language": random.choice(["en-US,en;q=0.9", "it-IT,it;q=0.9,en-US;q=0.8"]),
        "Referer": BASE_URL,
        "Cache-Control": "no-cache",
    })
    return s

SCRAPER = new_scraper()

def _looks_blocked(html: str) -> bool:
    if not html:
        return False
    return any(m in html[:5000] for m in _CF_BLOCK_MARKERS)

def fetch(url, timeout=25, retries=10, backoff=1.8, jitter=0.35):
    """
    Fetch resiliente con cloudscraper:
      - rileva pagine di challenge Cloudflare
      - ruota lo scraper/UA ogni 3 tentativi o se bloccato
      - rispetta Retry-After
    """
    global SCRAPER
    delay = 1.2
    last_exc = None

    for attempt in range(1, retries + 1):
        try:
            r = SCRAPER.get(url, timeout=timeout)
            status = r.status_code

            if status == 200 and not _looks_blocked(r.text):
                return r.text

            if status in (429, 403, 503) or _looks_blocked(r.text):
                ra = r.headers.get("Retry-After")
                wait = float(ra) if ra and str(ra).isdigit() else delay
                wait += random.uniform(0, wait * jitter)
                if attempt % 3 == 0 or _looks_blocked(r.text):
                    SCRAPER = new_scraper()
                time.sleep(wait)
                delay *= backoff
                continue

            if 500 <= status < 600:
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

# ───────────────────────────────────────────────────
# UTILS parsing
# ───────────────────────────────────────────────────
def polite_delay():
    time.sleep(random.uniform(1.0, 2.2))

def extract_table_html_by_id(soup: BeautifulSoup, table_id: str) -> Optional[str]:
    """Trova la <table id=...> anche se annidata in commenti HTML."""
    t = soup.find("table", id=table_id)
    if t:
        return str(t)
    for c in soup.find_all(string=lambda t: isinstance(t, Comment)):
        if table_id in c:
            parsed = BeautifulSoup(c, "html.parser").find("table", id=table_id)
            if parsed:
                return str(parsed)
    return None

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    if isinstance(df.columns, pd.MultiIndex):
        flat = []
        for c in df.columns:
            if isinstance(c, tuple):
                cand = next((x for x in c[::-1] if x), c[-1])
            else:
                cand = c
            flat.append(cand)
        df.columns = flat
    df.columns = pd.Index([str(c).strip().replace('.', '') for c in df.columns])
    return df

def map_columns(df_columns, columns_needed) -> Dict[str, str]:
    mapped = {}
    for key, possible in columns_needed.items():
        for name in possible:
            if name in df_columns:
                mapped[key] = name
                break
    return mapped

def clean_team_name(team_name: str) -> str:
    """Rimuove prefissi non maiuscoli (es. 'eng Liverpool' -> 'Liverpool')."""
    return pd.Series(team_name).str.replace(r'^[^A-ZÀ-ÖØ-Ý]*', '', regex=True).iloc[0]

# ───────────────────────────────────────────────────
# MAIN
# ───────────────────────────────────────────────────
def get_html_with_fallback(url_it: str, url_en: str) -> str:
    """
    Prova IT poi EN usando fetch() anti-403.
    """
    try:
        return fetch(url_it)
    except Exception:
        polite_delay()
        return fetch(url_en)

def process_league(lg: Dict):
    table_id   = lg['id']
    league_key = lg['league']
    url_it     = lg['url_it']
    url_en     = lg['url_en']

    print(f"\nElaborazione della lega: {league_key}")

    try:
        html = get_html_with_fallback(url_it, url_en)
    except Exception as e:
        print(f"Impossibile caricare la pagina IT/EN ({url_it}) (Errore: {e})")
        return

    soup = BeautifulSoup(html, "html.parser")
    table_html = extract_table_html_by_id(soup, table_id)
    if not table_html:
        print(f"Tabella con ID '{table_id}' non trovata su IT/EN: {url_it}")
        return

    try:
        df = pd.read_html(table_html, header=0)[0]
    except ValueError as e:
        print(f"Errore nel leggere la tabella con pandas per {league_key}: {e}")
        return

    df = normalize_columns(df)

    mapped = map_columns(list(df.columns), columns_needed)
    missing = [k for k in columns_needed.keys() if k not in mapped]
    if missing:
        print(f"Colonne mancanti per {league_key}: {missing}")
        print(f"Colonne disponibili: {list(df.columns)}")
        return

    ordered_src_cols = [mapped[k] for k in columns_needed.keys()]
    df_selected = df[ordered_src_cols].copy()
    df_selected.rename(columns={v: k for k, v in mapped.items()}, inplace=True)
    df_selected['Lega'] = league_key.replace('_', ' ')

    # Pulizia nomi squadra per Champions (prefissi country)
    if league_key == 'champions_league' and 'Squadra' in df_selected.columns:
        df_selected['Squadra'] = df_selected['Squadra'].apply(clean_team_name)

    # Salvataggio
    out_csv = os.path.join(OUTPUT_DIR, f"{league_key}.csv")
    try:
        os.makedirs(os.path.dirname(out_csv), exist_ok=True)
        df_selected.to_csv(out_csv, index=False, encoding='utf-8-sig')
        print(f"Salvato: {out_csv} ({len(df_selected)} righe).")
    except Exception as e:
        print(f"Errore nel salvare il CSV per {league_key}: {e}")

def main():
    for lg in leagues:
        process_league(lg)
        polite_delay()

if __name__ == "__main__":
    main()
