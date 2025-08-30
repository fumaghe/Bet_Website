# coding: utf-8
"""
FBref → CSV partite (Scores & Fixtures) 2025–2026 come stagione corrente
Leghe: PL, UCL, La Liga, Bundesliga, Serie A, Ligue 1

Anti-403:
 - cloudscraper (UA rotation) + retry/backoff + Retry-After + detection challenge
Parsing robusto:
 - tabelle anche dentro commenti <!-- ... -->
 - mapping table_id per stagione corrente 2025–2026 con fallback a 2024–2025
 - pulizia prefissi/suffissi country nei nomi squadra

Output:
 - public/data/all_leagues_matches.csv
"""

import os
import re
import time
import random
from typing import List, Optional, Tuple, Dict
from datetime import datetime, timedelta

import pandas as pd
import cloudscraper
from bs4 import BeautifulSoup, Comment
from requests.exceptions import HTTPError

# ───────────────────────────────────────────────────
# CONFIG
# ───────────────────────────────────────────────────
OUTPUT_CSV = "public/data/all_leagues_matches.csv"
os.makedirs(os.path.dirname(OUTPUT_CSV), exist_ok=True)

# Leghe (base_url, slug)
leagues: Dict[str, Tuple[str, str]] = {
    "Premier League":   ("https://fbref.com/en/comps/9",  "Premier League"),
    "Champions League": ("https://fbref.com/en/comps/8",  "Champions-League"),
    "La Liga":          ("https://fbref.com/en/comps/12", "La-Liga"),
    "Bundesliga":       ("https://fbref.com/en/comps/20", "Bundesliga"),
    "Serie A":          ("https://fbref.com/en/comps/11", "Serie-A"),
    "Ligue 1":          ("https://fbref.com/en/comps/13", "Ligue-1"),
}

# codici paese da rimuovere come prefisso/suffisso del nome squadra
COUNTRY_CODES = {
    "it","ch","eng","fr","de","nl","pt","es","ua","rs",
    "cz","sk","hr","sct","be","at"
}

# ───────────────────────────────────────────────────
# Anti-403 con cloudscraper (stessa logica dei tuoi script)
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
_CF_BLOCK = ("Just a moment","Attention Required","/cdn-cgi/challenge-platform","cf-browser-verification")

def new_scraper() -> cloudscraper.CloudScraper:
    ua = random.choice(USER_AGENTS)
    s = cloudscraper.create_scraper(browser={"custom": ua}, interpreter="nodejs")
    s.headers.update({
        "User-Agent": ua,
        "Accept-Language": random.choice(["en-US,en;q=0.9","it-IT,it;q=0.9,en-US;q=0.8"]),
        "Referer": BASE_URL,
        "Cache-Control": "no-cache",
    })
    return s

SCRAPER = new_scraper()

def _looks_blocked(html: str) -> bool:
    if not html:
        return False
    h = html[:6000]
    return any(m in h for m in _CF_BLOCK)

def fetch(url: str, timeout=25, retries=10, backoff=1.8, jitter=0.35) -> str:
    """
    GET resiliente con cloudscraper + rotation UA + rispetto Retry-After
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
            if st in (403,429,503) or _looks_blocked(r.text):
                ra = r.headers.get("Retry-After")
                wait = float(ra) if (ra and str(ra).isdigit()) else delay
                wait += random.uniform(0, wait*jitter)
                if attempt % 3 == 0 or _looks_blocked(r.text):
                    SCRAPER = new_scraper()
                time.sleep(wait)
                delay *= backoff
                continue
            if 500 <= st < 600:
                time.sleep(delay + random.uniform(0, delay*jitter))
                delay *= backoff
                continue
            r.raise_for_status()
        except Exception as e:
            last_exc = e
            if attempt % 3 == 0:
                SCRAPER = new_scraper()
            time.sleep(delay + random.uniform(0, delay*jitter))
            delay *= backoff
            continue
    raise HTTPError(f"Unable to fetch {url} after {retries} retries; last error: {last_exc}")

def polite_delay(short=False):
    time.sleep(random.uniform(0.8, 1.6) if short else random.uniform(3.0, 4.5))

# ───────────────────────────────────────────────────
# Helpers parsing / pulizia
# ───────────────────────────────────────────────────
def remove_country_code(team_name: str) -> str:
    name = (team_name or "").strip()
    if not name:
        return name
    for code in COUNTRY_CODES:
        if name.startswith(code):
            name = name[len(code):].strip()
            break
    for code in COUNTRY_CODES:
        if name.endswith(code):
            name = name[:-len(code)].strip()
            break
    return name

def extract_table_by_id(soup: BeautifulSoup, table_id: str) -> Optional[BeautifulSoup]:
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
    # skip header/spacer
    if "thead" in tr.get("class", []) or "spacer" in tr.get("class", []):
        return None

    date_td    = tr.find("td", {"data-stat": "date"})
    time_td    = tr.find("td", {"data-stat": "start_time"})
    home_td    = tr.find("td", {"data-stat": "home_team"})
    home_xg_td = tr.find("td", {"data-stat": "home_xg"})
    score_td   = tr.find("td", {"data-stat": "score"})
    away_xg_td = tr.find("td", {"data-stat": "away_xg"})
    away_td    = tr.find("td", {"data-stat": "away_team"})
    mw_th      = tr.find("th", {"data-stat": "gameweek"})

    if not (date_td and home_td and away_td and score_td):
        return None

    giorno    = date_td.get_text(strip=True)
    orario    = time_td.get_text(strip=True) if time_td else ""  # non sempre presente
    casa_raw  = home_td.get_text(strip=True)
    trasf_raw = away_td.get_text(strip=True)
    xg_casa   = home_xg_td.get_text(strip=True) if home_xg_td else ""
    xg_trasf  = away_xg_td.get_text(strip=True) if away_xg_td else ""
    punteggio = score_td.get_text(strip=True)
    sett      = mw_th.get_text(strip=True) if mw_th else ""

    casa  = remove_country_code(casa_raw)
    trasf = remove_country_code(trasf_raw)

    # split punteggio tipo "2–1" o "2-1"
    gol_casa = gol_trasf = ""
    if "–" in punteggio or "-" in punteggio:
        sep = "–" if "–" in punteggio else "-"
        parts = [p.strip() for p in punteggio.split(sep, 1)]
        if len(parts) == 2:
            gol_casa, gol_trasf = parts

    return [
        casa,               # Squadra Casa
        trasf,              # Squadra Trasferta
        orario,             # Orario
        giorno,             # Giorno
        league_readable,    # Campionato
        xg_casa,            # xG Casa
        gol_casa,           # Gol Casa
        gol_trasf,          # Gol Trasferta
        xg_trasf,           # xG Trasferta
        sett                # Sett.
    ]

def format_league_name(slug: str) -> str:
    return slug.replace("-", " ")

# ───────────────────────────────────────────────────
# Gestione stagione 2025–2026 (corrente) + fallback 2024–2025
# ───────────────────────────────────────────────────
def current_and_fallback_urls(base_url: str, league_slug: str) -> List[Tuple[str, str]]:
    """
    Ritorna [(url, season_label), ...] in ordine:
      1) 2025–2026 (senza anno nel path) → .../schedule/<slug>-Scores-and-Fixtures
      2) 2024–2025 (con anno nel path)  → .../2024-2025/schedule/2024-2025-<slug>-Scores-and-Fixtures
    """
    urls = [
        (f"{base_url}/schedule/{league_slug}-Scores-and-Fixtures", "2025-2026"),
        (f"{base_url}/2024-2025/schedule/2024-2025-{league_slug}-Scores-and-Fixtures", "2024-2025"),
    ]
    return urls

def table_ids_for_league(league_code: str, league_slug: str, season_label: str) -> List[str]:
    """
    IDs tabella da provare:
      - UCL: 'sched_all'
      - Campionati: sched_<season>_<code>_1, poi _2
    """
    if league_slug == "Champions-League":
        return ["sched_all"]
    return [f"sched_{season_label}_{league_code}_1", f"sched_{season_label}_{league_code}_2"]

def download_matches(base_url: str, league_slug: str, league_code: str, league_readable: str) -> List[List[str]]:
    matches: List[List[str]] = []
    for url, season_label in current_and_fallback_urls(base_url, league_slug):
        print(f"\n[INFO] Fetch {league_readable} ({season_label}) → {url}")
        try:
            html = fetch(url)
        except Exception as e:
            print(f"[WARN] fetch error: {e}")
            polite_delay()
            continue

        soup = BeautifulSoup(html, "html.parser")

        # prova tutti i possibili ID per questa stagione
        table = None
        used_id = None
        for tid in table_ids_for_league(league_code, league_slug, season_label):
            t = extract_table_by_id(soup, tid)
            if t:
                table = t
                used_id = tid
                break

        if not table:
            print(f"[WARN] table not found for {league_readable} {season_label}")
            polite_delay(short=True)
            continue

        trs = table.tbody.find_all("tr", recursive=False) if table.tbody else table.find_all("tr")
        ok = 0
        for tr in trs:
            row = parse_match_row(tr, league_readable)
            if row:
                matches.append(row)
                ok += 1

        print(f"[OK] {league_readable} {season_label}: {ok} rows (table_id={used_id})")
        polite_delay(short=True)

        # se abbiamo trovato righe per la stagione corrente, possiamo anche continuare a raccogliere quelle del fallback;
        # se preferisci SOLO la corrente, decommenta il return immediato:
        # if season_label == "2025-2026" and ok > 0:
        #     return matches

    return matches

# ───────────────────────────────────────────────────
# MAIN
# ───────────────────────────────────────────────────
def main():
    all_rows: List[List[str]] = []
    cols = [
        "Squadra Casa","Squadra Trasferta","Orario","Giorno","Campionato",
        "xG Casa","Gol Casa","Gol Trasferta","xG Trasferta","Sett."
    ]

    for league_title, (base_url, slug) in leagues.items():
        code = base_url.rstrip("/").split("/")[-1]
        readable = format_league_name(slug)
        print(f"\n=== {readable} (code={code}) ===")
        try:
            rows = download_matches(base_url, slug, code, readable)
            all_rows.extend(rows)
        except Exception as e:
            print(f"[ERROR] {readable}: {e}")

    df = pd.DataFrame(all_rows, columns=cols)

    # (opzionale) normalizza orario, es. applica +1h se ti serve
    def fix_time(t):
        try:
            if t:
                dt = datetime.strptime(t, "%H:%M")
                # dt += timedelta(hours=1)  # se vuoi shiftare di +1
                return dt.strftime("%H:%M")
        except Exception:
            pass
        return t

    df["Orario"] = df["Orario"].apply(fix_time)

    # (opzionale) tieni solo match con risultato:
    # df = df[(df["Gol Casa"].str.strip()!="") & (df["Gol Trasferta"].str.strip()!="")]

    try:
        df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
        print(f"\n💾 Salvato: {OUTPUT_CSV}  ({len(df)} righe)")
    except Exception as e:
        print(f"[ERROR] salvataggio CSV: {e}")

if __name__ == "__main__":
    main()
