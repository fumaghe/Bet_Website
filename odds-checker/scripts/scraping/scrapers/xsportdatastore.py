from scripts.scraping.scraper import Scraper as Scraper

def parse (
    scraper,
    events: dict[dict], ## events parsed
    cycle: str,
):
    ## xsport datastore single event request return only the data of the event, 
    ## this explains why we need to build a series of dictionaries around event data to make the normal code work
    for data in scraper.get_data():
        for sport_obj in data['sps']:
            if sport_obj['dsl']['IT'] not in ['Calcio', 'Pallacanestro', "Tennis"]: continue
            
            for category_obj in sport_obj['cts']:
                for tournament_obj in category_obj['tns']:
                    for event_obj in tournament_obj['el']:
                        if len(event_obj['scs']) == 0: continue
                        
                        code = str(event_obj['bid'])
                        if float(code) < 0: continue

                        odds = {}
                        
                        for odds_obj in event_obj['scs']:
                            match odds_obj['cs']:
                                ## football
                                ## 1X2: 1, X, 2
                                case 3: 
                                    bet_type = '1X2'
                                    outcomes = ['1', 'X', '2']

                                    outcomes_id = outcomes

                                ## DC: 1X
                                case 15: 
                                    bet_type = 'DC'
                                    outcomes = [ '1X', False ]
                                    outcomes_id = outcomes

                                ## DC: X2 or 12
                                case 16, 17:
                                    bet_type = 'DC'
                                    outcomes = [ False, 'X2' if odds_obj['cs'] == 16 else '12' ] ## [ 'X2' ] or [ '12' ] 
                                    outcomes_id = outcomes


                                ## GG/NG: GG, NG
                                case 18: 
                                    bet_type = 'GG/NG'
                                    outcomes = ['GG', 'NG']
                                    outcomes_id = ['GOAL', 'NOGOAL']

                                ## P/D: P, D
                                ## xsportdatastore is the only website/provider which support P/D bets
                                case 19: 
                                    bet_type = 'P/D'
                                    outcomes = ['P', 'D']
                                    outcomes_id = ['PARI', 'DISPARI']

                                ## basketball
                                ## T/T: 1, 2
                                case 110: 
                                    bet_type = 'T/T'
                                    outcomes = ['1', '2']
                                    outcomes_id = outcomes
                                
                                ## 1X2: 1, X, 2
                                case 8291: 
                                    bet_type = '1X2'
                                    outcomes = ['1', 'X', '2']
                                    outcomes_id = outcomes

                                ## tennis
                                ## T/T: 1, 2
                                case 20540: 
                                    bet_type = 'T/T' ## this is T/T SET not T/T GAME
                                    outcomes = ['1', '2']
                                    outcomes_id = outcomes
                                
                                case _: continue

                            if bet_type not in odds: odds[bet_type] = {}

                            if bet_type == 'DC': odds_id = f'barra-extra-cmp_474_1'
                            else: odds_id = f'barra-extra-{sport_obj["id"]}_{category_obj["id"]}_{tournament_obj["id"]}_{event_obj["bid"]}_{odds_obj["cs"]}_{odds_obj["h"]}'

                            odds[bet_type] |= {
                                outcomes[i]
                                .replace('PARI', 'P')
                                .replace('DISPARI', 'D')
                                .replace('NOGOAL', 'NG')
                                .replace('GOAL', 'GG') : odds_obj['eqs'][i]['q']/100.0 
                                for i in range(len( odds_obj['eqs'])) if outcomes[i] != False
                            }
                        

                        info = {
                            scraper.get_name(): {
                                'name': event_obj['dsl']['IT'],
                                'sport': sport_obj['dsl']['IT'].lower().replace('calcio', 'football').replace('pallacanestro', 'basket')
                            }
                        }

                        if event_obj['scr']:
                            info[scraper.get_name()]['start'] = event_obj['ts']
                            info[scraper.get_name()]['period'] = event_obj['scr']['st']
                            info[scraper.get_name()]['time'] = event_obj['scr']['t']
                            info[scraper.get_name()]['score'] = event_obj['scr']['scps']
        
                        ## check odds and add them to events dict, this function is imported from scraper.py so it can be generalized for all scrapers         
                        events = scraper.check_odds_and_append(odds, events, code, cycle, info)
    
    return events
