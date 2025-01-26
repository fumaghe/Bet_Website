from scripts.scraping.scraper import Scraper as Scraper

def parse (
    scraper: Scraper,
    events: dict[dict], ## events parsed
    cycle: str,
) -> dict[dict]:
    for data in scraper.get_data():
        for sport_obj in data['s'][0]['c']:
            sport = sport_obj['n']
            if sport_obj['n'] not in ['Calcio', 'Tennis']: continue

            for category_obj in sport_obj['c']:
                for event_obj in category_obj['ev']:
                    if 'o' not in event_obj: continue
                    
                    if 'sd' not in event_obj: continue
                    code = str(event_obj['sd']['lmt_mid'])
                    odds = {}
                    
                    for odds_obj in event_obj['o']:
                        
                        if odds_obj['k']['n'] == '1X2 Finale' and '1X2' not in odds: odds['1X2'] = {}
                        elif odds_obj['k']['n'] == 'GG/NG' and 'GG/NG' not in odds: odds['GG/NG'] = {}
                        elif odds_obj['k']['n'] == "Testa a Testa Match (Escl. Ritiro)" and 'T/T' not in odds: odds['T/T'] = {}
                        
                        bet_type = None
                        outcome = None
                        
                        match odds_obj["idne"]:
                            
                            ## football
                            case '14404': ## 1X2 -> 1
                                bet_type = '1X2'
                                outcome = '1'
                            
                            case '14405': ## 1X2 -> X
                                bet_type = '1X2'
                                outcome = 'X'
                        
                            case '14406': ## 1X2 -> 2
                                bet_type = '1X2'
                                outcome = '2'

                            case '138011': ## GG/NG -> GG
                                bet_type = 'GG/NG'
                                outcome = 'GG'

                            case '138012': ## GG/NG -> NG
                                bet_type = 'GG/NG'
                                outcome = 'NG'

                            ## tennis
                            case '432404': ## T/T -> 1
                                bet_type = 'T/T'
                                outcome = '1'

                            case '432405': ## T/T -> 2
                                bet_type = 'T/T'
                                outcome = '2'
                        
                        if not bet_type or not outcome: continue
                        if bet_type not in odds: odds[bet_type] = {}
                        odds[bet_type][outcome] = odds_obj['o']
                    info = {
                        scraper.get_name(): {
                            'sport': sport.lower().replace('calcio', 'football'),
                            'name': event_obj['n']
                        }
                    }

                    ## check odds and add them to events dict, this function is imported from scraper.py so it can be generalized for all scrapers         
                    events = scraper.check_odds_and_append(odds, events, code, cycle, info)

    return events