from scripts.scraping.scraper import Scraper as S

def parse (
    scraper: S,
    events: dict[dict], ## events parsed
    cycle: str,
):
    for data in scraper.get_data():
        for bet_group in data['infoAggiuntivaMap']:
            amd_code = "-".join(bet_group.split('-')[0:2])

            ## this is needed for when parsing function is used for a single event
            k = 'avvenimentoFeMap'
            ## if event is not present or there's no bet_radar_id
            if amd_code not in data['avvenimentoFeMap'] or not data['avvenimentoFeMap'][amd_code]['externalProviderInfoList']: continue

            code = str(data[k][amd_code]['externalProviderInfoList'][0]['idAvvProviderLive'])
            bet_type = ''
            outcomes = []
            odds = {}
            sport = ''
            
            ## football
            if data['infoAggiuntivaMap'][bet_group]['descrizione'] == 'GOAL/NOGOAL':
                ## GG/NG: GG, NG
                sport = 'football'
                bet_type = 'GG/NG'
                outcomes = [ 
                    str(odds_obj['codiceEsitoAAMS'])
                        .replace('1', 'GG')
                        .replace('2', 'NG') 
                    for odds_obj in data['infoAggiuntivaMap'][bet_group]['esitoList'] 
                ]
                
            elif data['infoAggiuntivaMap'][bet_group]['descrizione'] == 'ESITO FINALE 1X2':
                ## 1X2: 1, X, 2
                sport = 'football'
                bet_type = '1X2'
                outcomes = [ 
                    str(odds_obj['codiceEsitoAAMS'])
                        .replace('1', '11')
                        .replace('2', 'XX') 
                        .replace('3', '22')[0] 
                    for odds_obj in data['infoAggiuntivaMap'][bet_group]['esitoList'] 
                    ## we replaced like this and only took first string char
                    ## to avoid possibles double replacements which would mess the outcomes  
                ]

            elif data['infoAggiuntivaMap'][bet_group]['descrizione'] == 'DOPPIA CHANCE':
                ## DC: 1X, X2, 12
                sport = 'football'
                bet_type = 'DC'
                outcomes = [ 
                    str(odds_obj['codiceEsitoAAMS'])
                        .replace('1', '1X')
                        .replace('2', 'X2') 
                        .replace('3', '12') 
                    for odds_obj in data['infoAggiuntivaMap'][bet_group]['esitoList'] 
                ]

            ## basketball
            elif data['infoAggiuntivaMap'][bet_group]['descrizione'] == 'T/T RISULTATO':
                ## T/T: 1, 2
                sport = 'basket'
                bet_type = 'T/T'
                outcomes = [ 
                    str(odds_obj['codiceEsitoAAMS']) 
                    for odds_obj in data['infoAggiuntivaMap'][bet_group]['esitoList'] 
                ]

            elif data['infoAggiuntivaMap'][bet_group]['descrizione'] == 'PARI/DISPARI BASKET':
                ## P/D: P, D
                sport = 'basket'
                bet_type = 'P/D'
                outcomes = [ 
                    str(odds_obj['codiceEsitoAAMS'])
                        .replace('1', 'P')
                        .replace('2', 'D') 
                    for odds_obj in data['infoAggiuntivaMap'][bet_group]['esitoList'] 
                ]

            ## tennis
            elif data['infoAggiuntivaMap'][bet_group]['descrizione'] == "T/T MATCH (ESCL. RITIRO)":
                ## T/T: 1, 2
                sport = 'tennis'
                bet_type = "T/T"
                outcomes = [ str(odds_obj['codiceEsitoAAMS']) for odds_obj in data['infoAggiuntivaMap'][bet_group]['esitoList'] ]
    
            else: continue

            ## create odds dict and add identifiers 
            odds[bet_type] = { 
                outcomes[i]: data['infoAggiuntivaMap'][bet_group]['esitoList'][i]['quota']/100.0 for i in range(len(data['infoAggiuntivaMap'][bet_group]['esitoList'])) 
            }
            
            info = { 
                scraper.get_name(): {
                    'sport': sport,
                    'name': data[k][amd_code]['descrizione'],
                    'start': data[k][amd_code]['data']
                }
            }

            if data[k][amd_code]['livescore']:
                info[scraper.get_name()]['period'] = data[k][amd_code]['livescore']['statusDescription']
                info[scraper.get_name()]['score'] = [ f"{obj['team1']} - {obj['team2']}" for obj in data[k][amd_code]['livescore']['scoreList']]
                if len(info[scraper.get_name()]['score']) == 0: info[scraper.get_name()].pop('score')

            ## check odds and add them to events dict
            events = scraper.check_odds_and_append(odds, events, code, cycle, info)

    return events