import uuid

class Config():
    """config class, store all settings"""
    def __init__(self):
        # if true, arbs for testing, if false, arbs f4r real
        self.test = False
        self.user = "andrea"

        self.data_path = "files/data.json"
        self.arbs_path = 'files/arbs.json'
        self.events_path = "files/events.json"

        self.sport_to_use = ['tennis', 'football', "basketball"]
        self.website_to_use = [
            'allinbet',
            'better',
            'sisal',
            'eurobet',
            'vincitu',
            'playmatika',
        ]
        
        self.total_amount = 100 ## general amount to bet, it can vries due to round up of the bet
        self.bet_round_up = 5 ## the nearest digit to which bets stakes will be rounded
        self.sleep_after_run = 3

    def to_json(self):
        json = {}
        for attr in self.__dict__:
            json[attr] = self.__dict__[attr]
        
        return json