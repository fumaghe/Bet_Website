import asyncio
import glob
import os
import shutil
import json
import logging
import time
try:
    import uvloop
except ImportError:
    uvloop = None

from scripts.scraping.utils import manage_start, manage_prep, manage_scrape, manage_parse
from scripts.arbitrage.event import Event
from scripts.arbitrage.arb import Arb
from scripts.config import Config

def safe_remove(path):
    """Rimuove in sicurezza un file o una cartella senza fermarsi in caso di errori di permesso."""
    if not os.path.exists(path):
        return
    try:
        if os.path.isdir(path):
            shutil.rmtree(path)
        else:
            os.remove(path)
    except PermissionError as e:
        print(f"Impossibile rimuovere {path}, file in uso: {e}")
    except Exception as e:
        print(f"Errore rimuovendo {path}: {e}")

async def main(app_runner: str):
    # Chiudi eventuali logger aperti in precedenza (se necessario) - in questo caso non ce ne sono.
    
    # Pulizia log prima di inizializzare il logger
    files = glob.glob(os.path.join('odds-checker/files/logs', '*'))
    for f in files:
        safe_remove(f)

    path = os.path.join('odds-checker/files/logs', 'scrapers')
    # Se la directory esiste già, non la ricreare
    if not os.path.exists(path):
        try:
            os.mkdir(path)
        except FileExistsError:
            # Se esiste già, ignora l'errore
            pass

    # Ora inizializziamo il logger
    f = logging.Formatter("%(asctime)s: %(message)s")
    file_info = logging.FileHandler('odds-checker/files/logs/main.log', mode="a")
    file_info.setFormatter(f)

    cmd_info = logging.StreamHandler()
    cmd_info.setFormatter(f)
    logger = logging.getLogger('log')
    logger.setLevel('DEBUG')
    logger.addHandler(file_info)
    logger.addHandler(cmd_info)
    logger.info(f'Started application with {app_runner}')

    config = Config()
    with open(config.data_path, 'r') as f:
        data = json.loads(f.read())

    logger.info('Loaded needed files and cleaned logs')
    logger.info(f'Config: \n{json.dumps(config.to_json(), indent=2)}\n')

    scrapers = manage_start(
        scrapers_data=data,
        website_to_use=config.website_to_use,
    )
    logger.info(f'Created scrapers for: {", ".join(config.website_to_use)}')

    logger.info("Starting main loop, press CTRL + C to exit")
    i = 0

    while True:
        logger.info('')
        logger.info(f'Iteration n.{i}')

        scrapers_t = time.time()
        manage_prep(scrapers, i)
        await manage_scrape(scrapers, config.sport_to_use)
        events_dict = manage_parse(scrapers, i)
        logger.info(f"Scraping and parsing done in {round(time.time() - scrapers_t, 4)}s")

        events = list(map(lambda x: Event(**x, sport_to_use=config.sport_to_use), events_dict.values()))
        timestamp = str(time.time())

        if events:
            try:
                with open(config.events_path, 'r') as f:
                    old_events = json.loads(f.read())
            except:
                with open(config.events_path, 'w') as f:
                    f.write(json.dumps({}, indent=2))
                old_events = {}

            new_events = old_events | { timestamp: [e.to_dict() for e in events] }

            with open(config.events_path, 'w') as f:
                f.write(json.dumps(new_events, indent=2))

        arbs: dict[str, Arb] = {
            arb.score: arb
            for arb_list in map(
                lambda event: Arb.get_arbs(
                    event,
                    total_amount=config.total_amount,
                    bet_round_up=config.bet_round_up,
                    test=config.test
                ),
                events) for arb in arb_list if arb.get_status()
        }

        if arbs:
            try:
                with open(config.arbs_path, 'r') as f:
                    old_arbs = json.loads(f.read())
            except:
                with open(config.arbs_path, 'w') as f:
                    f.write(json.dumps({}, indent=2))
                old_arbs = {}

            new_arbs = old_arbs | { timestamp: [a.get_format() for a in arbs.values()] }

            with open(config.arbs_path, 'w') as f:
                f.write(json.dumps(new_arbs, indent=2))

        logger.info(f"Found: n.{len(events)} events, n.{len(arbs)} arbs")

        if config.sleep_after_run > 0 and not arbs:
            time.sleep(config.sleep_after_run)

        i += 1

if __name__ == "__main__":
    try:
        if uvloop:
            uvloop.run(main('uvloop'))
        else:
            asyncio.run(main('asyncio'))
    except KeyboardInterrupt:
        print('')
        print("Exiting programm...")
