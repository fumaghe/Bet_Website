from scripts.scraping.scraper import Scraper as Scraper

def parse (
    scraper,
    events: dict[dict], ## events parsed
    cycle: str,
):
    for data in scraper.get_data():
        for event_obj in data['_ListData']:
            code = event_obj['BrMatchid']
            odds = {}

            for odds_obj in event_obj['Class_Data']:
                bet_type = odds_obj['ClassDesc'].replace('FINALE ', '').replace(" LIVE", "").replace("ESITO 1X2 T.R. SENZA MARGINE", "1X2").replace("TESTA/TESTA (ESCL.RITIRO)", "T/T").replace("TESTA/TESTA SET (ESCL.RITIRO)", "T/T SET")
                if bet_type not in odds: odds[bet_type] = {}
                ## FOOTBALL
                ## 1X2: 1, X, 2
                ## GG/NG: GG, NG
                
                ## BASKETBALL
                ## T/T: 1, 2
                ## 1X2: 1, X, 2

                ## TENNIS
                ## T/T: 1, 2
                ## T/T SET: 1, 2
                
                if odds_obj['ClassDesc'] in [ 'FINALE 1X2', 'GG/NG', "T/T LIVE", "ESITO 1X2 T.R. SENZA MARGINE", "TESTA/TESTA (ESCL.RITIRO)", "TESTA/TESTA SET (ESCL.RITIRO)" ]:
                    for outcome_obj in odds_obj['Odds_Data']:
                        odds[bet_type][outcome_obj['GameName'].replace("(tt)", "")] = float(outcome_obj['GameOdd'])

            info = { 
                scraper.get_name(): {
                    'sport': event_obj["GroupDesc"].lower().replace('calcio', 'football'),
                    'name': event_obj["MatchName"].lower(),
                    'start': event_obj['StartDate'],
                    'tournament': event_obj["ManiDesc"].lower(),
                    'period': event_obj['Period'],
                    'minute': event_obj['Current_Time'],
                    'score': [e for e in event_obj['ScoreDetails'].split('|')]
                }
            }

            ## examples of period, minute and score.
            ## football
            ## "2", "75", "0-0|0-1"  ## time check could be if period == 1 & time > 43 or period == 2 and time > 88 
            ## basketball
            ## "3", "4", "37-28|20-31|10-15" ## in basketball time check could be if time is < 2 abort
            ## tennis
            ## "2", None, "5-7|4-2" ## no way to have info on current set score


            ## check odds and add them to events dict
            events = scraper.check_odds_and_append(odds, events, code, cycle, info)
    
    return events