import requests
from bs4 import BeautifulSoup
import pandas as pd
import os

leagues = [
    {
        'id': 'results2024-202582_overall',
        'url': 'https://fbref.com/it/comp/8/Statistiche-di-Champions-League',
        'league': 'champions_league'
    },
    {
        'id': 'results2024-202591_overall',
        'url': 'https://fbref.com/it/comp/9/Statistiche-di-Premier-League',
        'league': 'premier_league'
    },
    {
        'id': 'results2024-2025121_overall',
        'url': 'https://fbref.com/it/comp/12/Statistiche-di-La-Liga',
        'league': 'la_liga'
    },
    {
        'id': 'results2024-2025111_overall',
        'url': 'https://fbref.com/it/comp/11/Statistiche-di-Serie-A',
        'league': 'serie_a'
    },
    {
        'id': 'results2024-2025201_overall',
        'url': 'https://fbref.com/it/comp/20/Statistiche-di-Bundesliga',
        'league': 'bundesliga'
    },
    {
        'id': 'results2024-2025131_overall',
        'url': 'https://fbref.com/it/comp/13/Statistiche-di-Ligue-1',
        'league': 'ligue_1'
    }
]

columns_needed = {
    'Pos': ['Pos.', 'Pos'],
    'Squadra': ['Squadra'],
    'PG': ['PG'],
    'V': ['V'],
    'N': ['N'],
    'P': ['P'],
    'Rf': ['Rf'],
    'Rs': ['Rs'],
    'DR': ['DR'],
    'Pt': ['Pt', 'Pts'],
    'xG': ['xG'],
    'xGA': ['xGA']
}

def map_columns(df_columns, columns_needed):
    mapped_columns = {}
    for key, possible_names in columns_needed.items():
        for name in possible_names:
            if name in df_columns:
                mapped_columns[key] = name
                break
    return mapped_columns

def clean_team_name(team_name):
    """
    Rimuove tutto il testo prima della prima lettera maiuscola.
    Esempio: "eng Liverpool" -> "Liverpool"
    """
    return pd.Series(team_name).str.replace(r'^[^A-Z]*', '', regex=True).iloc[0]

for league in leagues:
    table_id = league['id']
    url = league['url']
    league_name = league['league']
    print(f"\nElaborazione della lega: {league_name}")
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"Impossibile caricare la pagina: {url} (Errore: {e})")
        continue
    soup = BeautifulSoup(response.text, 'html.parser')
    table = soup.find('table', id=table_id)
    if not table:
        print(f"Tabella con ID '{table_id}' non trovata nella pagina: {url}")
        continue
    try:
        df = pd.read_html(str(table), header=0)[0]
        df.columns = df.columns.str.strip().str.replace('.', '', regex=False)
        mapped_cols = map_columns(df.columns, columns_needed)
        missing_columns = [key for key in columns_needed if key not in mapped_cols]
        if missing_columns:
            print(f"Le seguenti colonne non sono state trovate nella tabella della lega {league_name}: {missing_columns}")
            print(f"Colonne disponibili: {list(df.columns)}")
            continue
        df_selected = df[[mapped_cols[key] for key in columns_needed]].copy()
        df_selected.rename(columns={v: k for k, v in mapped_cols.items()}, inplace=True)
        df_selected['Lega'] = league_name.replace('_', ' ')
        
        if league_name == 'champions_league':
            if 'Squadra' in df_selected.columns:
                df_selected['Squadra'] = df_selected['Squadra'].apply(clean_team_name)
        
        output_csv = os.path.join(f"public/data/standings/{league_name}.csv")
        try:
            df_selected.to_csv(output_csv, index=False, encoding='utf-8-sig')
            print(f"I dati della lega '{league_name}' sono stati salvati correttamente in '{output_csv}'.")
        except Exception as e:
            print(f"Errore nel salvare il CSV per la lega {league_name}: {e}")
    except ValueError as e:
        print(f"Errore nel leggere la tabella con pandas per la lega {league_name}: {e}")
        continue
