# coding: utf-8
"""
FBref Big5 → CSV giocatori (standard + misc + shooting) con anti-403
Output con header normalizzati:
Pos.,Giocatore,Nazione,Ruolo,Squadra,Competizione,Età,Nato,PG,Tit,Min,90 min,
Reti,Assist,G+A,R - Rig,Rigori,Rig T,Amm.,Esp.,xG,npxG,xAG,npxG+xAG,PrgC,PrgP,
Tiri totali,Tiri in porta,Falli commessi,Falli subiti,Fuorigioco
"""

import re, time, random
import pandas as pd
from bs4 import BeautifulSoup, Comment
from requests.exceptions import HTTPError
import cloudscraper

# ───────────────────── Anti-403 ─────────────────────
BASE_URL = "https://fbref.com"
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; rv:127.0) Gecko/20100101 Firefox/127.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36",
]
_CF = ("Just a moment","Attention Required","/cdn-cgi/challenge-platform","cf-browser-verification")

def new_scraper():
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

def _blocked(html: str) -> bool:
    return html and any(m in html[:6000] for m in _CF)

def fetch(url: str, timeout=25, retries=10, backoff=1.8, jitter=0.35) -> str:
    global SCRAPER
    delay = 1.2
    last_exc = None
    for attempt in range(1, retries+1):
        try:
            r = SCRAPER.get(url, timeout=timeout)
            st = r.status_code
            if st == 200 and not _blocked(r.text):
                return r.text
            if st in (403,429,503) or _blocked(r.text):
                ra = r.headers.get("Retry-After")
                wait = float(ra) if ra and str(ra).isdigit() else delay
                wait += random.uniform(0, wait*jitter)
                if attempt % 3 == 0 or _blocked(r.text):
                    SCRAPER = new_scraper()
                time.sleep(wait); delay *= backoff; continue
            if 500 <= st < 600:
                time.sleep(delay + random.uniform(0, delay*jitter))
                delay *= backoff; continue
            r.raise_for_status()
        except Exception as e:
            last_exc = e
            if attempt % 3 == 0: SCRAPER = new_scraper()
            time.sleep(delay + random.uniform(0, delay*jitter))
            delay *= backoff; continue
    raise HTTPError(f"Unable to fetch {url} after {retries} retries; last error: {last_exc}")

def find_table(soup: BeautifulSoup, table_id: str):
    t = soup.find('table', id=table_id)
    if t: return t
    for com in soup.find_all(string=lambda x: isinstance(x, Comment)):
        cs = BeautifulSoup(com, 'lxml').find('table', id=table_id)
        if cs:
            print(f"Found table '{table_id}' in comments.")
            return cs
    return None

# ───────────── Helpers normalizzazione ─────────────
ROLE_MAP = {
    "DF": "Dif", "D": "Dif",
    "MF": "Cen", "M": "Cen",
    "FW": "Att", "F": "Att",
    "GK": "Por", "G": "Por",
}
def map_role(pos: str) -> str:
    if not pos: return ""
    # separatori vari: . , / spazio
    parts = re.split(r"[\,\./\s]+", pos.strip())
    mapped = []
    for p in parts:
        p = p.strip().upper()
        mapped.append(ROLE_MAP.get(p, p.title()))
    return ".".join([m for m in mapped if m])

def normalize_nation(n: str) -> str:
    if not n: return ""
    m = re.search(r"([A-Z]{3})$", n.strip())
    return m.group(1) if m else n.strip()[-3:].upper()

COL_RENAME = {
    # standard FBref (anche su pagina IT)
    "Rk": "Pos.",
    "Player": "Giocatore", "Giocatore": "Giocatore",
    "Nation": "Nazione", "Nazione": "Nazione",
    "Pos": "Ruolo", "Ruolo": "Ruolo",
    "Squad": "Squadra", "Squadra": "Squadra",
    "Comp": "Competizione", "Competizione": "Competizione",
    "Age": "Età", "Età": "Età",
    "Born": "Nato", "Nato": "Nato",
    "MP": "PG", "PG": "PG",
    "Starts": "Tit", "Tit": "Tit",
    "Min": "Min",
    "90s": "90 min", "90 min": "90 min",
    "Gls": "Reti", "Reti": "Reti",
    "Ast": "Assist", "Assist": "Assist",
    "G+A": "G+A",
    "G-PK": "R - Rig", "R - Rig": "R - Rig",
    "PK": "Rigori", "Rigori": "Rigori",
    "PKatt": "Rig T", "Rig T": "Rig T",
    "CrdY": "Amm.", "Amm.": "Amm.",
    "CrdR": "Esp.", "Esp.": "Esp.",
    "xG": "xG", "npxG": "npxG", "xAG": "xAG", "npxG+xAG": "npxG+xAG",
    "PrgC": "PrgC", "PrgP": "PrgP",
    # shooting + misc che mappiamo noi
    "shots": "Tiri totali",
    "shots_on_target": "Tiri in porta",
    "fouls": "Falli commessi",
    "fouled": "Falli subiti",
    "offsides": "Fuorigioco",
}

FINAL_ORDER = [
    "Pos.","Giocatore","Nazione","Ruolo","Squadra","Competizione","Età","Nato",
    "PG","Tit","Min","90 min","Reti","Assist","G+A","R - Rig","Rigori","Rig T",
    "Amm.","Esp.","xG","npxG","xAG","npxG+xAG","PrgC","PrgP",
    "Tiri totali","Tiri in porta","Falli commessi","Falli subiti","Fuorigioco"
]

def normalize_numeric_str(s: str) -> str:
    return (s or "").replace('"', '').replace(',', '.')

def ensure_col(df: pd.DataFrame, col: str):
    if col not in df.columns:
        df[col] = ""

# ───────────── Lettura tabelle Big5 ─────────────
def fetch_table_standard(url, table_id):
    html = fetch(url)
    soup = BeautifulSoup(html, 'lxml')
    table = find_table(soup, table_id)
    if not table:
        raise ValueError(f"Tabella '{table_id}' non trovata.")

    thead = table.find('thead')
    hdrs = thead.find_all('tr') if thead else []
    if len(hdrs) < 2:
        raise ValueError("Intestazioni insufficienti (attesa 2 righe).")
    headers = [th.get_text(strip=True) for th in hdrs[1].find_all('th')]

    # prendi tutto (o tronca su "PrgP" se presente)
    try:
        stop = headers.index("PrgP") + 1
    except ValueError:
        stop = len(headers)
    headers = headers[:stop]

    rows = []
    tbody = table.find('tbody')
    for tr in (tbody.find_all('tr') if tbody else []):
        if tr.find('th', {"scope": "row"}) is None:
            continue
        cells = tr.find_all(['th','td'])
        vals = []
        for c in cells[:stop]:
            if c.find('a'):
                txt = c.find('a').get_text(strip=True)
            elif c.find('img'):
                txt = c.find('img').get('alt','').strip()
            else:
                txt = c.get_text(strip=True)
            vals.append(txt)
        rows.append(vals)

    df = pd.DataFrame(rows, columns=headers)
    # pulizia
    for col in df.columns:
        df[col] = df[col].astype(str).apply(normalize_numeric_str)
    return df

def fetch_table_by_datastat(url, table_id, desired_to_synonyms, out_map):
    html = fetch(url)
    soup = BeautifulSoup(html, 'lxml')
    table = find_table(soup, table_id)
    if not table:
        raise ValueError(f"Tabella '{table_id}' non trovata.")

    # individua data-stat disponibili
    present = set()
    for tr in table.find('tbody').find_all('tr'):
        for cell in tr.find_all(['th','td']):
            ds = cell.get('data-stat')
            if ds: present.add(ds)

    # scegli sinonimo presente
    chosen = {}
    for target, syns in desired_to_synonyms.items():
        chosen[target] = next((s for s in syns if s in present), None)

    rows = []
    for tr in table.find('tbody').find_all('tr'):
        row = {}
        for cell in tr.find_all(['th','td']):
            ds = cell.get('data-stat')
            if not ds: continue
            for target, picked in chosen.items():
                if picked and ds == picked:
                    row[target] = cell.get_text(strip=True)
        # prova a prendere sempre il player
        if 'player' not in row:
            thp = tr.find(['th','td'], attrs={'data-stat':'player'})
            if thp: row['player'] = thp.get_text(strip=True)
        # produce riga con tutte le chiavi target
        rows.append({ out_map[k]: row.get(k, "") for k in out_map })

    df = pd.DataFrame(rows)
    for col in df.columns:
        df[col] = df[col].astype(str).apply(normalize_numeric_str)
    return df

# ───────────────────── MAIN ─────────────────────
def main():
    try:
        # URL Big5 in ITA
        url_std = "https://fbref.com/it/comp/Big5/stats/calciatori/Statistiche-di-I-5-campionati-europei-piu-importanti"
        url_misc = "https://fbref.com/it/comp/Big5/misc/calciatori/Statistiche-di-I-5-campionati-europei-piu-importanti"
        url_shot = "https://fbref.com/it/comp/Big5/shooting/calciatori/Statistiche-di-I-5-campionati-europei-piu-importanti"

        df_std  = fetch_table_standard(url_std,  "stats_standard")
        time.sleep(random.uniform(1.0, 2.0))
        df_misc = fetch_table_by_datastat(
            url_misc, "stats_misc",
            {"player":["player"], "fouls":["fouls"], "fouled":["fouled"], "offsides":["offsides"]},
            {"player":"Giocatore","fouls":"Falli commessi","fouled":"Falli subiti","offsides":"Fuorigioco"}
        )
        time.sleep(random.uniform(1.0, 2.0))
        df_shot = fetch_table_by_datastat(
            url_shot, "stats_shooting",
            {"player":["player"], "shots":["shots","shots_total"], "shots_on_target":["shots_on_target","shots_on_target_total"]},
            {"player":"Giocatore","shots":"Tiri totali","shots_on_target":"Tiri in porta"}
        )

        # rinomina colonne standard/misc/shooting ai nomi finali
        df_std.rename(columns=COL_RENAME, inplace=True)
        df_misc.rename(columns=COL_RENAME, inplace=True)
        df_shot.rename(columns=COL_RENAME, inplace=True)

        # assicurati colonna 'Giocatore' ovunque
        for d in (df_std, df_misc, df_shot):
            if "Giocatore" not in d.columns:
                # prova varianti
                for c in ("Player","Calciatore","Nome"):
                    if c in d.columns:
                        d.rename(columns={c:"Giocatore"}, inplace=True)
                        break
            if "Giocatore" not in d.columns:
                d["Giocatore"] = ""

        # merge: chiave principale Giocatore + (Squadra se presente in std)
        on_keys = ["Giocatore"]
        if "Squadra" in df_std.columns:
            on_keys = ["Giocatore","Squadra"]
            for d in (df_misc, df_shot):
                if "Squadra" not in d.columns:
                    d["Squadra"] = ""

        df = df_std.merge(df_shot, on=on_keys, how="left").merge(df_misc, on=on_keys, how="left")

        # normalizza valori
        if "Nazione" in df.columns:
            df["Nazione"] = df["Nazione"].apply(normalize_nation)
        if "Ruolo" in df.columns:
            df["Ruolo"] = df["Ruolo"].apply(map_role)

        # rinomina eventuali colonne residue (inglesi) ai target italiani
        df.rename(columns=COL_RENAME, inplace=True)

        # garantisci tutte le colonne finali
        for c in FINAL_ORDER:
            ensure_col(df, c)

        # dedup
        if "Squadra" in df.columns:
            df.drop_duplicates(subset=["Giocatore","Squadra"], inplace=True)
        else:
            df.drop_duplicates(subset=["Giocatore"], inplace=True)

        # ordina colonne
        extras = [c for c in df.columns if c not in FINAL_ORDER]
        df = df[FINAL_ORDER + extras]  # (eventuali extra rimangono in coda, se non li vuoi: df = df[FINAL_ORDER])

        # salva
        out_path = "public/data/players/league_players.csv"
        df.to_csv(out_path, index=False, encoding="utf-8-sig")
        print("✅ league_players.csv creato con header e formato corretti.")

    except Exception as e:
        print(f"❌ Errore: {e}")

if __name__ == "__main__":
    main()
