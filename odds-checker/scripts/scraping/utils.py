# scripts/scraping/utils.py

import httpx
from scripts.scraping.scraper import Scraper
import asyncio

def manage_start(
    website_to_use: list[str],
    scrapers_data: dict,
) -> list[Scraper]:
    """Initialize Scrapers object"""
    scrapers: list[Scraper] = []

    # Crea gli scraper basati sui dati e sui siti web da utilizzare
    for scraper_name in website_to_use:
        if scraper_name not in scrapers_data:
            continue  # Salta se lo scraper non è definito nei dati

        scraper_info = scrapers_data[scraper_name]
        scraper = Scraper(
            headers=scraper_info.get('headers', {}),
            urls=scraper_info.get('scraper-urls', {}),
            name=scraper_name,
            provider=scraper_info.get('provider', ''),
            focus_url=scraper_info.get('focus-url', '')
        )
        scrapers.append(scraper)

    return scrapers

def manage_prep(scrapers: list[Scraper], i: int):
    """Prepara gli scraper per una nuova iterazione"""
    for scraper in scrapers:
        scraper.prep(i)

async def manage_scrape(scrapers: list[Scraper], sport_to_use: list[str]) -> None:
    """Scrape data from websites using async HTTP requests"""
    async with httpx.AsyncClient() as session:
        tasks = []
        for scraper in scrapers:
            for sport, url in scraper.get_urls().items():
                if sport != 'all' and sport not in sport_to_use:
                    continue
                tasks.append(asyncio.create_task(scraper.scrape(session, url)))
        await asyncio.gather(*tasks)

def manage_parse(scrapers: list[Scraper], i: int) -> dict[str, dict]:
    """Parse scraped data into events"""
    events = {}
    for scraper in scrapers:
        events = scraper.parse(events, i)
    return events
