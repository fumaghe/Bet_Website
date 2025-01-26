class Event():
    def __init__(
        self,
        bet_radar_id: str,
        odds: dict,
        cycle: int,  
        info: dict,
        sport_to_use: list[str]
    ):
        self.bet_radar_id = bet_radar_id
        self.odds = odds
        self.info = info
        self.sport = info[list(info.keys())[0]]['sport']
        self.i = cycle
        
        self.sport_to_use = sport_to_use
        
        self.status = self.set_status() ## this value if True means that the game is good to bet on
        self.highest_odds = self.set_highest_odds()
    
    def get_status(self): return self.status
    def get_highest_odds(self): return self.highest_odds
    def get_bet_radar_id(self): return self.bet_radar_id
    def get_index(self): return self.i
    def get_info(self): return self.info
        
    def get_format(self):
        return {
            "bet_radar_id": self.bet_radar_id,
            "cycle": self.i,
            "status": self.status,
            "info": self.info,
            "odds": self.odds,
        }

    def set_status(self) -> bool:
        sport = self.info[list(self.info.keys())[0]]['sport']

        if sport not in self.sport_to_use: return False

        if sport == 'football':
            ## should check if all scores are == and time is not > 43 (1P) or > 88 (2P)
            all_scores = []
            all_minutes = []
            period = None
            
            for website in self.info:

                if website == 'vincitu': 
                    all_scores.append(tuple([int(e) for e in self.info[website]['score'][-1].split('-')]))
                    all_minutes.append(int(self.info[website]['minute']) if self.info[website]['period'] == "1" else int(self.info[website]['minute']) + 45)
                    if self.info[website]['period'] != "0": 
                        period = self.info[website]['period']

                elif website == 'sisal' and 'score' in self.info[website]: 
                    all_scores.append(tuple([int(e) for e in self.info[website]['score'][0].split('-')]))

                elif website == "better":
                    all_scores.append(tuple([int(e) for e in self.info[website]['score'].split("-")]))
                    all_minutes.append(int(self.info[website]['minute'].split('&')[0]))
                
                elif website == 'eurobet' and self.info[website]['score']:
                    all_scores.append(tuple([int(e) for e in self.info[website]['score'].split("-")]))
                    # period = self.info[website]['period']
                    try: all_minutes.append(int(self.info[website]['minute'].split("'")[0]))
                    except: return False

            if len(set(all_scores)) != 1: return False
            
            if all_minutes:
                minute = int(sum(all_minutes)/len(all_minutes))
                #TODO: improve this
                if (period and period == '1' and minute > 43) or (minute > 43 and minute < 46): return False
                elif minute > 88: return False

            return True

        if sport == 'basket':
            ## should check if all scores are == and time remaining is > 2
            return True

        if sport == 'tennis':
            all_scores = []
            
            for website in self.info:
                
                if 'score' in self.info[website] and isinstance(self.info[website]['score'], str):
                    if ':' in self.info[website]['score']:
                        scores = self.info[website]['score'].split(':')
                    elif '-' in self.info[website]['score']:
                        scores = self.info[website]['score'].split('-')
                
                ## vincitu has not score for set, only game
                    
                elif website == 'allinbet':
                    scores = self.info[website]['score'][0].split('#')[1].split(':')

                elif website == 'sisal' and 'score' in self.info[website]:
                    scores = self.info[website]['score'][-1].split('-')

                else: continue # vincitu

                try:                        
                    scores = list(map(lambda x: int(x) , scores))
                except Exception as e: 
                    ## it means that there are values like "AD" or "ADV" meaning the score is 40 - AD or 40 - ADV so it can be skipped
                    return False
                for score in scores:
                    if score == 40 or (score >= 5 and score < 15): return False
                
                all_scores.append(tuple(scores))

            if len(set(all_scores)) != 1: 
                return False
            
            return True
        
    def set_highest_odds(self):
        highest_odds = {}
        for bet_type in self.odds:
            if bet_type not in highest_odds: highest_odds[bet_type] = {}
            for outcome in self.odds[bet_type]:
                for website in self.odds[bet_type][outcome]:
                    if outcome not in highest_odds[bet_type] or self.odds[bet_type][outcome][website] > highest_odds[bet_type][outcome][0]:
                        highest_odds[bet_type][outcome] = [self.odds[bet_type][outcome][website], website]
                        ## = [odd, [website_data, website]]
                        ## if this outcome doesn't exist in highest_odds
                        ## if outcome exist and the examinated one is greater

                    elif self.odds[bet_type][outcome][website] == highest_odds[bet_type][outcome][0]:
                        highest_odds[bet_type][outcome].append(website)
                        ## if an outcome alredy exist and the examinated one is the same
                        ## add current bet identifier and sportbook to list
                        ## this give us the posibility to create a series of sportbooks combinations
                        ## so that we can chose the most suited one
        
        return highest_odds
    
    def to_dict(self):
        return {
            "bet_radar_id": self.bet_radar_id,
            "odds": self.odds,
            "cycle": self.i,
            "info": self.info,
            "status": self.status,
            "highest_odds": self.highest_odds,
        }