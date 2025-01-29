import requests
from bs4 import BeautifulSoup, Comment
import pandas as pd

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

    data_stats = set()
    for tr in table.find('tbody').find_all('tr'):
        cells = tr.find_all(['th', 'td'])
        for cell in cells:
            data_stat = cell.get('data-stat')
            if data_stat:
                data_stats.add(data_stat)

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

    df = pd.DataFrame(rows)

    # Pulizia dei dati
    for col in df.columns:
        df[col] = df[col].astype(str).str.replace('"', '').str.replace(',', '.')

    return df

def main():
    try:
        # URLs and table IDs for Champions League players
        url_champions_standard = "https://fbref.com/it/comp/8/stats/calciatori/Statistiche-di-Champions-League"
        table_id_standard = "stats_standard"

        url_misc_giocatori = "https://fbref.com/it/comp/Big5/misc/calciatori/Statistiche-di-Champions-League"
        table_id_misc = "stats_misc"
        columns_to_extract_giocatori = ["player", "fouls", "fouled", "offsides"]  # data-stat keys
        column_mapping_giocatori = {
            "player": "Giocatore",
            "fouls": "Falli commessi",
            "fouled": "Falli subiti",
            "offsides": "Fuorigioco"
        }

        url_tir = "https://fbref.com/it/comp/Big5/shooting/calciatori/Statistiche-di-Champions-League"
        table_id_tir = "stats_shooting"
        columns_to_extract_tir = ["player", "shots", "shots_on_target"]  # Corretto: 'shots' invece di 'shots_total'
        column_mapping_tir = {
            "player": "Giocatore",
            "shots": "Tiri totali",              # Corretto: 'shots' mappa a 'Tiri totali'
            "shots_on_target": "Tiri in porta"
        }

        # Fetch standard player stats
        df_standard = fetch_table(url_champions_standard, table_id_standard)

        # Fetch miscellaneous player stats
        df_misc = fetch_misc_table(url_misc_giocatori, table_id_misc, columns_to_extract_giocatori, column_mapping_giocatori)

        # Fetch shooting stats
        df_tir = fetch_misc_table(url_tir, table_id_tir, columns_to_extract_tir, column_mapping_tir)

        # Validate 'Giocatore' column
        if 'Giocatore' not in df_tir.columns:
            raise KeyError("'Giocatore' non trovato in df_tir (Champions_giocatori)")

        # Merge dataframes on "Giocatore"
        merged_df = pd.merge(df_standard, df_tir, on="Giocatore", how="inner")
        df_total = pd.merge(merged_df, df_misc, on="Giocatore", how="inner")
        df_total.drop_duplicates(subset=["Giocatore", "Squadra"], inplace=True)

        # Save to CSV
        df_total.to_csv("public/data/players/champions_league_players.csv", index=False, encoding='utf-8')
        print("champions_league_players.csv has been created successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
