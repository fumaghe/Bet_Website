# coding: utf-8
"""
FBref → CSV partite stagione (Scores & Fixtures) per:
Premier League, Champions League, La Liga, Bundesliga, Serie A, Ligue 1

Anti-403:
 - cloudscraper con rotazione User-Agent
 - retry/backoff e rispetto Retry-After
 - rilevazione challenge Cloudflare
Parsing robusto:
 - trova la tabella anche se nascosta nei commenti <!-- ... -->
 - pulizia prefissi/suffissi country nei nomi squadra

Output:
 - public/data/players/matches_season.csv
"""

import re
import os
import time
import random
from datetime import datetime
from typing import List, Optional, Tuple, Dict

import pandas as pd
import cloudscraper
from bs4 import BeautifulSoup, Comment
from requests.exceptions import HTTPError

# ───────────────────────────────────────────────────
# CONFIG
# ───────────────────────────────────────────────────
OUTPUT_CSV = "public/data/players/matches_season.csv"
os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)

# Base URLs EN (più stabili)
leagues: Dict[str, Tuple[str, str]] = {
    "Premier League": ("https://fbref.com/en/comps/9",  "Premier League"),
    "Champions League": ("https://fbref.com/en/comps/8",  "Champions-League"),
    "La Liga": ("https://fbref.com/en/comps/12", "La-Liga"),
    "Bundesliga": ("https://fbref.com/en/comps/20", "Bundesliga"),
    "Serie A": ("https://fbref.com/en/comps/11", "Serie-A"),
    "Ligue 1": ("https://fbref.com/en/comps/13", "Ligue-1"),
}

# codici paese da rimuovere come prefisso/suffisso del nome squadra
COUNTRY_CODES = {
    "hr", "it", "de", "sk", "eng", "es", "ch", "rs", "cz", "nl", "pt", "fr", "ua", "sct", "be", "at"
}

# ───────────────────────────────────────────────────
# Anti-403 con cloudscraper (stessa logica del tuo fetch)
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

def fetch(url, timeout=25, retries=10, backoff=1.8, jitter=0.35) -> str:
    """
    Fetch resiliente con cloudscraper:
      - rileva challenge Cloudflare (403/429/503 o marker HTML)
      - ruota UA/scraper ogni 3 tentativi o se bloccato
      - gestisce Retry-After
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

def polite_delay(short=False):
    time.sleep(random.uniform(0.8, 1.6) if short else random.uniform(3.0, 5.0))

# ───────────────────────────────────────────────────
# Helpers parsing / pulizia
# ───────────────────────────────────────────────────
def remove_country_codes(team_name: str) -> str:
    """
    Rimuove un eventuale codice paese all'inizio o alla fine di team_name.
    """
    name = (team_name or "").strip()
    for code in COUNTRY_CODES:
        if name.startswith(code):
            name = name[len(code):]
            break
    for code in COUNTRY_CODES:
        if name.endswith(code):
            name = name[:-len(code)]
            break
    return name.strip()

def extract_table_by_id(soup: BeautifulSoup, table_id: str) -> Optional[BeautifulSoup]:
    """
    Trova <table id="..."> anche se è annidata in commenti HTML.
    """
    t = soup.find("table", id=table_id)
    if t:
        return t
    for c in soup.find_all(string=lambda t: isinstance(t, Comment)):
        if table_id in c:
            parsed = BeautifulSoup(c, "html.parser").find("table", id=table_id)
            if parsed:
                return parsed
    return None

def parse_match_row(tr, league_readable: str):
    """
    Estrae [casa, trasf, orario, giorno, campionato] da una riga valida.
    """
    if "thead" in tr.get("class", []) or "spacer" in tr.get("class", []):
        return None

    date_td = tr.find("td", {"data-stat": "date"})
    time_td = tr.find("td", {"data-stat": "start_time"})
    home_td = tr.find("td", {"data-stat": "home_team"})
    away_td = tr.find("td", {"data-stat": "away_team"})

    if not (date_td and home_td and away_td):
        return None

    giorno = date_td.get_text(strip=True)
    orario = time_td.get_text(strip=True) if time_td else ""  # alcuni non hanno l'ora
    casa   = home_td.get_text(strip=True)
    trasf  = away_td.get_text(strip=True)

    casa_clean  = remove_country_codes(casa)
    trasf_clean = remove_country_codes(trasf)

    if not giorno or not casa_clean or not trasf_clean:
        return None

    return [casa_clean, trasf_clean, orario, giorno, league_readable]

def format_league_name(league_name: str) -> str:
    """Esempio: 'Champions-League' -> 'Champions League'."""
    return league_name.replace("-", " ")

# ───────────────────────────────────────────────────
# Logica stagioni e download
# ───────────────────────────────────────────────────
def season_candidates() -> List[str]:
    """
    Restituisce ID stagione da provare per le leghe domestiche:
    prima '2025-2026', poi '2024-2025' (fallback).
    """
    # Determina la stagione "corrente" in ambito europeo: se mese >= 7 → y-(y+1)
    today = datetime.now()
    y = today.year
    if today.month >= 7:
        cur = f"{y}-{y+1}"
        prev = f"{y-1}-{y}"
    else:
        cur = f"{y-1}-{y}"
        prev = f"{y-2}-{y-1}"
    # Forziamo comunque 2025-2026 come prima opzione (contesto attuale),
    # poi aggiungiamo la calcolata e 2024-2025 come ulteriore fallback.
    cands = []
    for s in ["2025-2026", cur, "2024-2025"]:
        if s not in cands:
            cands.append(s)
    return cands

def table_ids_for_league(league_code: str, league_slug: str) -> List[str]:
    """
    Genera possibili ID tabella 'sched_YYYY-YYYY_<code>_1' per domestiche.
    Per Champions usa 'sched_all'.
    """
    if league_slug == "Champions-League":
        return ["sched_all"]
    ids = [f"sched_{s}_{league_code}_1" for s in season_candidates()]
    # A volte l'indice finale non è _1: proviamo anche _2
    ids += [f"sched_{s}_{league_code}_2" for s in season_candidates()]
    return ids

def download_matches(base_url: str, league_slug: str, league_code: str, league_readable: str) -> List[List[str]]:
    """
    Scarica la pagina Scores & Fixtures per la lega e ritorna righe [casa, trasf, orario, giorno, campionato].
    """
    url = f"{base_url}/schedule/{league_slug}-Scores-and-Fixtures"
    print(f"Scarico da {url}")

    html = fetch(url)
    soup = BeautifulSoup(html, "html.parser")

    # prova tab id multipli (stagione corrente → fallback)
    candidate_ids = table_ids_for_league(league_code, league_slug)
    table = None
    used_id = None
    for tid in candidate_ids:
        table = extract_table_by_id(soup, tid)
        if table:
            used_id = tid
            break

    if not table:
        print(f"❌ Tabella non trovata per {league_readable}. IDs provati: {candidate_ids}")
        return []

    if table.tbody:
        rows = table.tbody.find_all("tr", recursive=False)
    else:
        rows = table.find_all("tr")

    matches: List[List[str]] = []
    for tr in rows:
        row = parse_match_row(tr, league_readable)
        if row:
            matches.append(row)

    print(f"✅ {league_readable}: trovate {len(matches)} partite (table_id={used_id})")
    polite_delay(short=True)
    return matches

# ───────────────────────────────────────────────────
# MAIN
# ───────────────────────────────────────────────────
def main():
    all_data: List[List[str]] = []
    columns = ["Squadra Casa", "Squadra Trasferta", "Orario", "Giorno", "Campionato"]

    for league_title, (base_url, league_slug) in leagues.items():
        readable = format_league_name(league_slug)
        code = base_url.rstrip("/").split("/")[-1]  # es. "9" per PL
        print(f"\n==> Inizio download: {readable} <==")
        try:
            rows = download_matches(base_url, league_slug, code, readable)
            all_data.extend(rows)
        except Exception as e:
            print(f"Errore su {readable}: {e}")

    df = pd.DataFrame(all_data, columns=columns)

    # Salvataggio
    try:
        df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
        print(f"\n💾 Salvato: {OUTPUT_CSV} ({len(df)} righe)")
    except Exception as e:
        print(f"Errore nel salvataggio CSV: {e}")

if __name__ == "__main__":
    main()
