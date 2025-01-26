from scripts.scraping.scraper import Scraper as Scraper


def parse (
    scraper: Scraper,
    events: dict[dict], ## parsed events
    cycle: str,
):
    for data in scraper.get_data():
        for event_obj in data['leo']:
            if event_obj['snm'] not in ['Calcio', 'Basket', 'Tennis']: continue
            
            market = 'mktWbG'
            if market not in event_obj: continue
            
            code = str(event_obj['eprId'])
            try: float(code)
            except: continue
            odds = {}
            
            for odds_id in event_obj[market]:
                
                ## football
                ## 1X2: 1, X, 2
                ## DC: 1X, 12, X2
                ## GG/NG: GG, NG
                if event_obj['snm'] == 'Calcio':
                    if event_obj[market][odds_id]['mn'] not in ['1X2', 'Doppia Chance', 'Gol/Nogol']: continue
                    bet_type = event_obj[market][odds_id]['mn'].replace('Doppia Chance', 'DC').replace('Gol/Nogol', 'GG/NG')
                
                ## basketball
                ## T/T: 1, 2
                elif event_obj['snm'] == 'Basket':
                    if event_obj[market][odds_id]['mn'] not in ['Testa A Testa']: continue
                    bet_type = "T/T"
                
                ## tennis
                ## T/T
                elif event_obj['snm'] == 'Tennis':
                    if event_obj[market][odds_id]['mn'] not in ["Vincente Incontro (escl. ritiro)"]: continue
                    bet_type = "T/T"
            
                ## create odds dict
                odds[bet_type] = { 
                    outcome_obj['sn']: outcome_obj['ov'] for outcome_obj in event_obj[market][odds_id]['ms']['0.0']['asl'] 
                }
            

            info = {
                scraper.get_name(): {
                    'sport': event_obj['snm'].lower().replace('calcio', 'football'),
                    'name': event_obj['enm'].lower(),
                    'minute': event_obj['scrbrd']['eT'],
                    'score': event_obj['scrbrd']['mS']
                }
            }

            ## check odds and add them to events dict, this function is imported from scraper.py so it can be generalized for all scrapers         
            events = scraper.check_odds_and_append(odds, events, code, cycle, info)
            
    return events
