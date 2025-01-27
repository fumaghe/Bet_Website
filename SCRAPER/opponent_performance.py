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
        # URLs and table IDs
        url_standard = "https://fbref.com/it/comp/Big5/stats/squadre/Statistiche-di-I-5-campionati-europei-piu-importanti"
        table_id_standard = "stats_teams_standard_against"

        url_misc = "https://fbref.com/it/comp/Big5/misc/squadre/Statistiche-di-I-5-campionati-europei-piu-importanti"
        table_id_misc = "stats_teams_misc_against"

        # Fetch standard stats
        df_standard = fetch_table(url_standard, table_id_standard)

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

        # Merge dataframes on "Squadra"
        merged_df = pd.merge(df_standard, df_misc, on="Squadra", how="inner")
                
        # Clean 'Squadra' column
        merged_df['Squadra'] = merged_df['Squadra'].str.replace('vs ', '', regex=False)

        # Save to CSV
        merged_df.to_csv("public/data/opponent_performance.csv", index=False, encoding='utf-8')
        print("opponent_performance.csv has been created successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
