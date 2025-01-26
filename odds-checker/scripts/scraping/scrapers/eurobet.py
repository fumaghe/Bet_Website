from scripts.scraping.scraper import Scraper as S

def parse (
    scraper: S,
    events: dict[dict], ## events parsed
    cycle: str
):
    for data in scraper.get_data():
        for sport_obj in data['result']['itemList']:
            if sport_obj['discipline'] not in ['Calcio', 'Basket', 'Tennis']: continue
            
            for event_obj in sport_obj['itemList']:
                if len(event_obj['betGroupList']) == 0  or 'programBetradarInfo' not in event_obj['eventInfo'] or 'matchId' not in event_obj['eventInfo']['programBetradarInfo'] or event_obj['eventInfo']['programBetradarInfo']['matchId'] == 0: continue
                
                code = str(event_obj['eventInfo']['programBetradarInfo']['matchId'])
                odds = {}

                for odds_obj in event_obj['betGroupList'][0]['oddGroupList']:
                    ## football
                    ## 1X2: 1, X, 2
                    if 'alternativeDescription' not in odds_obj: continue
                    if odds_obj['alternativeDescription'] == '1X2 MATCH':
                        bet_type = '1X2'
                        outcomes = ['1', 'X', '2']
                    
                    ## basketball & tennis 
                    ## T/T: 1, 2
                    elif odds_obj['alternativeDescription'] == "T/T MATCH":
                        bet_type = 'T/T'
                        outcomes = ['1', '2']
                    
                    else: continue

                    odds[bet_type] = {
                        outcomes[i]: odds_obj['oddList'][i]['oddValue']/100.0
                        for i in range(len(outcomes))
                    } 
                    
                ## add identifier
                for bet_type in odds:
                    for outcome in odds[bet_type]:
                        odds[bet_type][outcome] = [
                            odds[bet_type][outcome], 
                            {
                                "url": f"https://www.eurobet.it/it/scommesse-live/#!{event_obj['breadCrumbInfo']['fullUrl']}",
                                "bet_type": bet_type,
                                "outcome": outcome,
                                "sport": sport_obj['discipline']
                            }
                        ]
                
                info = {
                    scraper.get_name(): {
                        'name': event_obj['eventInfo']['eventDescription'].lower(),
                        'sport': sport_obj['discipline'].replace("Calcio", 'football').lower(),
                        'minute': False if 'timeLive' not in event_obj['eventInfo'] else event_obj['eventInfo']['timeLive'],
                        'score': False if 'timeLive' not in event_obj['eventInfo'] else event_obj['eventInfo']['teamHome']['score'] + ' - ' + event_obj['eventInfo']['teamAway']['score'],
                        # 'period': '1' if 'scoreList' not in event_obj['eventInfo']['teamHome'] else "2"
                    }
                }
            
                ## check odds and add them to events dict, this function is imported from scraper.py so it can be generalized for all scrapers         
                events = scraper.check_odds_and_append(odds, events, code, cycle, info)

    return events