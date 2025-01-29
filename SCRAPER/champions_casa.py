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

def main():
    try:
        # URL and table ID for Champions League home performances
        url_champions = "https://fbref.com/it/comp/8/stats/Statistiche-di-Champions-League"
        table_id_champions = "stats_squads_standard_for"

        # Fetch the table
        df_champions = fetch_table(url_champions, table_id_champions)

        # Save to CSV
        df_champions.to_csv("public/data/champions_casa.csv", index=False, encoding='utf-8')
        print("champions_casa.csv has been created successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
