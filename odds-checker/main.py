# main.py

import asyncio
import glob
import os
import shutil
import json
import logging
import time
import sys
from typing import Optional

from scripts.scraping.utils import manage_start, manage_prep, manage_scrape, manage_parse
from scripts.arbitrage.event import Event
from scripts.arbitrage.arb import Arb
from scripts.config import Config

# Switch to SelectorEventLoop on Windows to avoid proactor issues
if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Definizione di run_event a livello di modulo
run_event = asyncio.Event()

# Definizione di un logger globale
logger = None

# Configurazione del logger
def setup_logger(logs_dir):
    f_formatter = logging.Formatter("%(asctime)s: %(message)s")
    file_info = logging.FileHandler(os.path.join(logs_dir, 'main.log'), mode="a")
    file_info.setFormatter(f_formatter)

    cmd_info = logging.StreamHandler()
    cmd_info.setFormatter(f_formatter)

    logger_instance = logging.getLogger('log')
    logger_instance.setLevel('DEBUG')
    logger_instance.addHandler(file_info)
    logger_instance.addHandler(cmd_info)
    return logger_instance

# Funzione per rimuovere file in sicurezza
def safe_remove(path: str) -> None:
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

# Funzione per ascoltare i comandi su stdin in un thread
def listen_stdin_sync(loop):
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break  # EOF
            command = line.strip().lower()
            if command == "stop":
                if logger:
                    logger.info("Comando 'stop' ricevuto. Terminando il processo...")
                else:
                    print("Comando 'stop' ricevuto. Terminando il processo...")
                asyncio.run_coroutine_threadsafe(stop_loop(), loop)
                break
        except Exception as e:
            if logger:
                logger.error(f"Errore nel listener stdin: {e}")
            else:
                print(f"Errore nel listener stdin: {e}")
            break

async def stop_loop():
    run_event.clear()

async def arbitrage_loop(logger, scrapers, config):
    i = 0
    while run_event.is_set():
        try:
            logger.info('')
            logger.info(f'Iteration n.{i}')

            scrapers_t = time.time()
            manage_prep(scrapers, i)
            await manage_scrape(scrapers, config.sport_to_use)
            events_dict = manage_parse(scrapers, i)
            logger.info(f"Scraping and parsing done in {round(time.time() - scrapers_t, 4)}s")

            events = [Event(**x, sport_to_use=config.sport_to_use) for x in events_dict.values()]
            timestamp = str(time.time())

            if events:
                try:
                    with open(config.events_path, 'r') as f:
                        old_events = json.load(f)
                except FileNotFoundError:
                    old_events = {}
                    with open(config.events_path, 'w') as f:
                        json.dump(old_events, f, indent=2)
                except json.JSONDecodeError as e:
                    logger.error(f"Errore nel parsing di {config.events_path}: {e}")
                    old_events = {}

                new_events = {**old_events, timestamp: [e.to_dict() for e in events]}

                with open(config.events_path, 'w') as f:
                    json.dump(new_events, f, indent=2)

            arbs: dict[str, Arb] = {
                arb.score: arb
                for arb_list in map(
                    lambda event: Arb.get_arbs(
                        event,
                        total_amount=config.total_amount,
                        bet_round_up=config.bet_round_up,
                        test=config.test
                    ),
                    events
                ) for arb in arb_list if arb.get_status()
            }

            if arbs:
                try:
                    with open(config.arbs_path, 'r') as f:
                        old_arbs = json.load(f)
                except FileNotFoundError:
                    old_arbs = {}
                    with open(config.arbs_path, 'w') as f:
                        json.dump(old_arbs, f, indent=2)
                except json.JSONDecodeError as e:
                    logger.error(f"Errore nel parsing di {config.arbs_path}: {e}")
                    old_arbs = {}

                new_arbs = {**old_arbs, timestamp: [a.get_format() for a in arbs.values()]}

                with open(config.arbs_path, 'w') as f:
                    json.dump(new_arbs, f, indent=2)

            logger.info(f"Found: n.{len(events)} events, n.{len(arbs)} arbs")

            if config.sleep_after_run > 0 and not arbs:
                logger.info(f"Sleeping for {config.sleep_after_run} seconds")
                await asyncio.sleep(config.sleep_after_run)

            i += 1

        except asyncio.CancelledError:
            logger.info("Arbitrage loop cancellato.")
            break
        except Exception as e:
            logger.error(f"Error in arbitrage loop: {e}")
    logger.info("Run event cleared, exiting arbitrage loop.")
    logger.info("Arbitrage loop exited. Terminating main.")

async def main():
    global logger

    # Ottieni la directory assoluta dello script
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Definisci i percorsi relativi
    files_dir = os.path.join(script_dir, 'files')
    logs_dir = os.path.join(files_dir, 'logs')
    scrapers_dir = os.path.join(logs_dir, 'scrapers')
    data_path = os.path.join(files_dir, 'data.json')
    events_path = os.path.join(files_dir, 'events.json')
    arbs_path = os.path.join(files_dir, 'arbs.json')

    # Crea la directory scrapers se non esiste
    try:
        os.makedirs(scrapers_dir, exist_ok=True)
    except Exception as e:
        print(f"Errore creando la directory {scrapers_dir}: {e}")
        sys.exit(1)

    # Rimuovi i file di log esistenti nella directory logs/scrapers/
    scrapers_log_files = glob.glob(os.path.join(scrapers_dir, '*.log'))
    for f in scrapers_log_files:
        safe_remove(f)

    # Rimuovi il main.log e altri file nella directory logs/
    other_log_files = glob.glob(os.path.join(logs_dir, '*.log'))
    for f in other_log_files:
        safe_remove(f)

    # Ricrea la directory scrapers dopo la rimozione
    os.makedirs(scrapers_dir, exist_ok=True)

    # Configurazione del logger
    logger = setup_logger(logs_dir)
    logger.info('Started application')

    # Caricamento della configurazione
    config = Config()
    config_path = config.data_path  # "files/data.json"

    # Verifica se il file di configurazione esiste
    if not os.path.isfile(config_path):
        logger.error(f"Il file di configurazione non esiste: {config_path}")
        raise FileNotFoundError(f"Il file di configurazione non esiste: {config_path}")

    with open(config_path, 'r') as f_config:
        try:
            data = json.load(f_config)
        except json.JSONDecodeError as e:
            logger.error(f"Errore nel parsing del file di configurazione: {e}")
            raise

    logger.info('Loaded needed files and cleaned logs')
    logger.info(f'Config: \n{json.dumps(config.to_json(), indent=2)}\n')

    # Inizializzazione degli scraper
    scrapers = manage_start(
        scrapers_data=data,
        website_to_use=config.website_to_use
    )
    logger.info(f'Created scrapers for: {", ".join(config.website_to_use)}')

    # Avvia il listener su stdin in un thread
    loop = asyncio.get_running_loop()
    import threading
    listener_thread = threading.Thread(target=listen_stdin_sync, args=(loop,), daemon=True)
    listener_thread.start()

    # Imposta run_event come set per avviare il loop
    run_event.set()

    # Avvia il loop di arbitraggio
    try:
        await arbitrage_loop(logger, scrapers, config)
    finally:
        # Dopo il loop, esci
        logger.info("Arbitrage loop exited. Terminating main.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        if logger:
            logger.info("Terminato manualmente tramite KeyboardInterrupt")
        else:
            print("Terminato manualmente tramite KeyboardInterrupt")
