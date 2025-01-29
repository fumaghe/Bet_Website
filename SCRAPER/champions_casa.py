import requests
from bs4 import BeautifulSoup, Comment
import pandas as pd
import os
import re
from unidecode import unidecode  # Opzionale, solo se necessario per rimuovere accenti

# Definizione dei codici delle nazioni
COUNTRY_CODES = [
    "hr", "it", "de", "sk", "eng", "es", "ch",
    "rs", "cz", "nl", "pt", "fr", "ua", "sct",
    "be", "at"
]

def fetch_table(url, table_id):
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/112.0.0.0 Safari/537.36"
        )
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'lxml')

    table = soup.find('table', id=table_id)
    if not table:
        comments = soup.find_all(string=lambda text: isinstance(text, Comment))
        for comment in comments:
            comment_soup = BeautifulSoup(comment, 'lxml')
            table = comment_soup.find('table', id=table_id)
            if table:
                print(f"Found table with ID '{table_id}' within comments.")
                break
    if not table:
        raise ValueError(f"Tabella con ID '{table_id}' non trovata.")
    
    print(f"Table '{table_id}' found.")

    thead = table.find('thead')
    header_rows = thead.find_all('tr')
    if len(header_rows) < 2:
        raise ValueError(f"Non ci sono abbastanza righe di intestazione nella tabella con ID '{table_id}'.")
    header_tr = header_rows[1]
    headers = [th.get_text(strip=True) for th in header_tr.find_all('th')]
    try:
        stop_index = headers.index("PrgP") + 1
    except ValueError:
        stop_index = len(headers)
    headers = headers[:stop_index]
    print(f"Headers extracted: {headers}")

    rows = []
    for tr in table.find('tbody').find_all('tr'):
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
        rows.append(row)
    print(f"Number of rows extracted from standard table: {len(rows)}")

    df = pd.DataFrame(rows, columns=headers)

    # Pulizia dei dati
    for col in df.columns:
        df[col] = df[col].astype(str).str.replace('"', '').str.replace(',', '.')

    if 'Nazione' in df.columns:
        df['Nazione'] = df['Nazione'].str.extract(r'([A-Z]+)', expand=False)

    nazione_cols = [col for col in df.columns if "Nazione" in col]
    for col in nazione_cols:
        df[col] = df[col].str.extract(r'([A-Z]+)', expand=False)

    if 'Competizione' in df.columns:
        df['Competizione'] = df['Competizione'].str.replace(' Premier League', 'Premier League')
    return df

def fetch_misc_table(url, table_id, columns_to_extract, column_mapping):
    response = requests.get(url)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, 'lxml')

    table = soup.find('table', id=table_id)
    if not table:
        comments = soup.find_all(string=lambda text: isinstance(text, Comment))
        for comment in comments:
            comment_soup = BeautifulSoup(comment, 'lxml')
            table = comment_soup.find('table', id=table_id)
            if table:
                print(f"Found table with ID '{table_id}' within comments.")
                break
    if not table:
        raise ValueError(f"Tabella con ID '{table_id}' non trovata.")
    
    print(f"Misc table '{table_id}' found.")

    data_stats = set()
    for tr in table.find('tbody').find_all('tr'):
        cells = tr.find_all(['th', 'td'])
        for cell in cells:
            data_stat = cell.get('data-stat')
            if data_stat:
                data_stats.add(data_stat)
    print(f"Data-stat keys found in misc table: {data_stats}")

    missing_stats = [stat for stat in columns_to_extract if stat not in data_stats]
    if missing_stats:
        print(f"Warning: The following data-stat keys are missing: {', '.join(missing_stats)}")

    rows = []
    for tr in table.find('tbody').find_all('tr'):
        cells = tr.find_all(['th', 'td'])
        row_data = {}
        for cell in cells:
            data_stat = cell.get('data-stat')
            if data_stat in columns_to_extract:
                row_data[data_stat] = cell.get_text(strip=True)
        # Only include rows where all required data-stat keys are present
        if all(data_stat in row_data for data_stat in columns_to_extract):
            row = {column_mapping[data_stat]: row_data[data_stat] for data_stat in columns_to_extract}
            rows.append(row)
    print(f"Number of rows extracted from misc table: {len(rows)}")

    df = pd.DataFrame(rows)

    # Pulizia dei dati
    for col in df.columns:
        df[col] = df[col].astype(str).str.replace('"', '').str.replace(',', '.')

    return df

def getDefaultStats():
    return {
        'goalsFor': 0,
        'goalsAgainst': 0,
        'xG': 0,
        'xAG': 0,
        'foulsCommitted': 0,
        'foulsSuffered': 0,
        'offside': 0,
        'yellowCards': 0,
        'played': 0,
        'perMatchGoalsFor': 0,
        'perMatchGoalsAgainst': 0,
        'perMatchXG': 0,
        'perMatchXAG': 0,
        'perMatchFoulsCommitted': 0,
        'perMatchFoulsSuffered': 0,
        'perMatchOffside': 0,
        'perMatchYellowCards': 0,
        'leagueAverage': {
            'total': {
                'Reti Fatte': 0,
                'Reti Subite': 0,
                'xG': 0,
                'xAG': 0,
                'Falli Comessi': 0,
                'Falli Subiti': 0,
                'Fuorigioco': 0,
                'Ammonizioni': 0,
            },
            'perMatch': {
                'Reti Fatte': 0,
                'Reti Subite': 0,
                'xG': 0,
                'xAG': 0,
                'Falli Comessi': 0,
                'Falli Subiti': 0,
                'Fuorigioco': 0,
                'Ammonizioni': 0,
            },
        },
    }

def main():
    try:
        # URLs and table IDs
        url_standard = "https://fbref.com/it/comp/8/stats/Statistiche-di-Champions-League"
        table_id_standard = "stats_squads_standard_for"

        url_misc = "https://fbref.com/it/comp/8/misc/Statistiche-di-Champions-League"
        table_id_misc = "stats_squads_misc_for"

        # Fetch standard stats
        df_standard = fetch_table(url_standard, table_id_standard)
        print("Standard stats fetched successfully.")

        # Define columns to extract and their mappings
        columns_to_extract = ["team", "fouls", "fouled", "offsides"]  # data-stat keys
        column_mapping = {
            "team": "Squadra",
            "fouls": "Falli commessi",
            "fouled": "Falli subiti",
            "offsides": "Fuorigioco"
        }

        # Fetch miscellaneous stats
        df_misc = fetch_misc_table(url_misc, table_id_misc, columns_to_extract, column_mapping)
        print("Misc stats fetched successfully.")

        # Normalizza i nomi delle squadre per il merge (senza lowercasing)
        df_standard['Squadra'] = df_standard['Squadra'].str.strip()
        df_misc['Squadra'] = df_misc['Squadra'].str.strip()
        
        # Rimuovi il prefisso della nazione (es. 'engArsenal' -> 'Arsenal')
        # Crea la regex pattern con i codici delle nazioni
        pattern = r'^(' + '|'.join(COUNTRY_CODES) + r')'
        df_misc['Squadra'] = df_misc['Squadra'].str.replace(pattern, '', regex=True).str.strip()
        print("Squadra names after removing prefixes:")
        print("Standard:", df_standard['Squadra'].unique())
        print("Misc:", df_misc['Squadra'].unique())

        # Normalizza ulteriormente rimuovendo accenti (opzionale)
        # Se preferisci mantenere gli accenti, puoi commentare queste righe
        # df_standard['Squadra'] = df_standard['Squadra'].apply(lambda x: unidecode(x))
        # df_misc['Squadra'] = df_misc['Squadra'].apply(lambda x: unidecode(x))
        # print("Squadra names after removing accents:")
        # print("Standard:", df_standard['Squadra'].unique())
        # print("Misc:", df_misc['Squadra'].unique())

        # Merge dataframes on "Squadra"
        merged_df = pd.merge(df_standard, df_misc, on="Squadra", how="inner")
        print(f"Merged dataframe has {merged_df.shape[0]} rows and {merged_df.shape[1]} columns.")

        if merged_df.empty:
            print("Merged dataframe is empty. Check if 'Squadra' matches correctly in both dataframes.")
            
            # Squadre presenti solo in standard
            standard_only = set(df_standard['Squadra']) - set(df_misc['Squadra'])
            print(f"Squadre presenti solo in standard: {standard_only}")

            # Squadre presenti solo in misc
            misc_only = set(df_misc['Squadra']) - set(df_standard['Squadra'])
            print(f"Squadre presenti solo in misc: {misc_only}")
        else:
            # Aggiungi la colonna 'Competizione'
            merged_df['Competizione'] = 'Champions League'

            # Aggiungi altre colonne necessarie con valori predefiniti o derivati
            # Prima controlla se le colonne esistono
            columns_to_convert = {
                'N. di giocatori': int,
                'Età': float,
                'Poss.': float,
                'PG': int,
                'Tit': int,
                'Min': int,
                '90 min': float,
                'Reti': int,
                'Assist': int,
                'G+A': int,
                'R - Rig': int,
                'Rigori': int,
                'Rig T': int,
                'Amm.': int,
                'Esp.': int,
                'xG': float,
                'npxG': float,
                'xAG': float,
                'npxG+xAG': float,
                'PrgC': int,
                'PrgP': int,
                'Falli commessi': int,
                'Falli subiti': int,
                'Fuorigioco': int
            }

            for col, dtype in columns_to_convert.items():
                if col in merged_df.columns:
                    try:
                        merged_df[col] = merged_df[col].astype(dtype)
                    except Exception as e:
                        print(f"Errore nella conversione della colonna '{col}': {e}")
                else:
                    print(f"Colonna '{col}' non trovata nel dataframe.")

            # Ordina le colonne come desiderato
            desired_order = [
                'Pos.', 'Squadra', 'Competizione', 'N. di giocatori', 'Età', 'Poss.', 'PG',
                'Tit', 'Min', '90 min', 'Reti', 'Assist', 'G+A', 'R - Rig', 'Rigori',
                'Rig T', 'Amm.', 'Esp.', 'xG', 'npxG', 'xAG', 'npxG+xAG', 'PrgC',
                'PrgP', 'Falli commessi', 'Falli subiti', 'Fuorigioco'
            ]

            # Verifica quali colonne sono presenti e ordina di conseguenza
            existing_columns = [col for col in desired_order if col in merged_df.columns]
            merged_df = merged_df[existing_columns]

            # Assicurati che la directory esista
            os.makedirs("public/data/standings/", exist_ok=True)

            # Salva il CSV
            output_csv = os.path.join("public/data/champions_casa.csv")
            try:
                merged_df.to_csv(output_csv, index=False, encoding='utf-8-sig')
                print(f"champions_league.csv has been created successfully at '{output_csv}'.")
            except Exception as e:
                print(f"Errore nel salvare il CSV per la lega Champions League: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
