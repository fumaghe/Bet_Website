import itertools
from scripts.arbitrage.event import Event

class Arb():
    def __init__(
        self,
        bet_radar_id: str,
        cycle: int,
        sportbooks: list[str],
        probability: float,
        bets: list[dict],
        info: dict,

        total_amount: int,
        bet_round_up: int,
        providers: list[str],
    ):
        self.bet_radar_id = bet_radar_id
        self.bets: list[dict] = bets
        self.i = cycle
        self.info = info
        self.sportbooks = sportbooks
        self.probability = probability

        self.status = self.set_status(total_amount, bet_round_up, providers)
        self.score = self.set_score(providers)
    
    def get_status(self): return self.status
    
    def get_bets(self): return self.bets

    def get_format(self) -> dict[str: any]:
        """Return a json dict which can be saved in database"""
        return {
            "bet_radar_id": self.bet_radar_id,
            "cycle": self.i,
            "probability": self.probability,
            "sportbooks": self.sportbooks,
            "staus": self.status,
            "score": self.score,
            "info": self.info,
            "bets": self.bets,
        }

    def set_status(
        self, 
        total_amount: int, 
        bet_round_up: int,
        providers: list[str]
    ) -> bool:

        """Return True if: 
- total stake is not too much higher than amount in config file
- all websites have enough balance to bet
- all possible outcomes are positive
- providers combination is good

"""        
        return True

    def set_score(
        self,
        providers: list[str]
    ) -> float:

        """Give the arb a score:
- assign a value from 0 to 10 pts based on probability,
- if it's more than 2 bet - 0.5 pt
- if not all providers are different - 0.5 pt
- if sport isn't football - 1 pt
"""
        score = (1 - self.probability)*10
        if len(self.sportbooks) == 2: score += 0.5 

        if len(self.sportbooks) == len(providers): score += 0.5
        
        website = list(self.info.keys())[0]
        if 'sport' in self.info[website] and self.info[website]['sport'] == 'football':
            score += 1

        return score

    def check_correspondence(self, arb) -> bool:
        """Return True if the arb given is the same (it has the same bets on the same sportbooks) else False"""
        if len(self.bets) != len(arb.bets): return False

        for bet in self.bets:
            corr_bet = [b for b in arb.bets if b['sportbook'] == bet['sportbook']]
            if not corr_bet: return False

            if bet['bet_type'] != corr_bet[0]['bet_type']: return False
            if bet['outcome'] != corr_bet[0]['outcome']: return False
        
        return True

    @classmethod
    def get_arbs(
        cls, 
        event: Event,
        bet_round_up: int,
        total_amount: int,
        test: bool = False
        
    ) -> list:
        """search for arbs"""
        arbs = [] 

        for bet_type in event.get_highest_odds():
            ## calculate probabilies
            ## 1X2, GG/NG, T/T, P/D, DC & 1X2
            possible_arbs = []
            probability = 1

            if bet_type == '1X2' or bet_type == 'GG/NG' or bet_type == 'T/T' or bet_type == 'P/D':
                if bet_type == '1X2' and len(event.get_highest_odds()[bet_type]) != 3: continue
                elif bet_type != '1X2' and len(event.get_highest_odds()[bet_type]) != 2: continue

                possible_arbs.append({ 
                    bet_type : { 
                        outcome : event.get_highest_odds()[bet_type][outcome] 
                        for outcome in event.get_highest_odds()[bet_type] 
                    }
                })

            elif bet_type == 'DC' and '1X2' in event.get_highest_odds():
                for outcome in event.get_highest_odds()[bet_type]:
                    ## one_x_two = correspondant 1X2 result
                    one_x_two = outcome.replace('1X', '2').replace('X2', '1').replace('12', 'X')
                    if one_x_two not in event.get_highest_odds()['1X2'] or outcome not in ['1X', 'X2', '12']: continue

                    possible_arbs.append({
                        bet_type : {
                            outcome: event.get_highest_odds()[bet_type][outcome]
                        }, 
                        '1X2': {
                            one_x_two:  event.get_highest_odds()['1X2'][one_x_two]
                        }
                    }) 

            for arb in possible_arbs:
                if bet_type == 'DC': 
                    probability = 1/event.get_highest_odds()[bet_type][list(arb['DC'].keys())[0]][0] + 1/event.get_highest_odds()['1X2'][list(arb['1X2'].keys())[0]][0]
                else: 
                    probability = sum([1/event.get_highest_odds()[bet_type][outcome][0] for outcome in event.get_highest_odds()[bet_type]])
                
                #! SECURITY CHECK --> porbability_treshold, prob value must be in its limits
                # comment this line to see fake arbs
                if arb is None or (probability >= 1 and not test): 
                    continue 

                ## sportbooks = [['sisal'], ['eurobet', 'goldbet']]
                sportbooks = []
                for bet_type in arb:
                    for outcome in arb[bet_type]:
                        sportbooks.append(
                            [l for l in arb[bet_type][outcome] if not isinstance(l, (int, float))]
                        )

                ## combinations = [['sisal', 'eurobet'], ['sisal', 'goldbet']]
                combinations = [ list(c) for c in list(itertools.product(*sportbooks)) if len(c) == len(set(c))]

                ## if there isn't a valid combination of sportbook: skip
                if len(combinations) == 0: continue

                ## loop treough all combinations of the same arb but with differents sportbooks/scrapers
                for c in combinations:
                    i = 0
                    a = {
                        'bet_radar_id': event.get_bet_radar_id(),
                        'cycle': event.get_index(),
                        'sportbooks': c,
                        'probability': probability,
                        'bets': [],
                        'info': event.get_info(),
                        'providers': []
                    }

                    for bet_type in arb:
                        for outcome in arb[bet_type]:
                            a['providers'].append(c[i] if c[i] in ['sisal', 'eurobet', 'vincitu', 'eurobet'] else c[i].replace('allinbet', 'xsportdatastore').replace('better', 'lottomatica').replace('playmatika', 'microgame'))
                            a['bets'].append(
                                {
                                    'odd': arb[bet_type][outcome][0],
                                    'sportbook': c[i],
                                    'stake': bet_round_up * round( total_amount * (1 / arb[bet_type][outcome][0]) / probability / bet_round_up),
                                    'win': bet_round_up * round( total_amount * (1 / arb[bet_type][outcome][0]) / probability / bet_round_up) * arb[bet_type][outcome][0],
                                    'bet_type': bet_type,
                                    'outcome': outcome,
                                    'bet_radar_id': event.get_bet_radar_id()
                                }
                            )
                            i += 1

                    # print(a)

                    arbs.append(
                        cls(
                            **a,
                            total_amount=total_amount,
                            bet_round_up=bet_round_up,
                        )
                    )

        return arbs
            