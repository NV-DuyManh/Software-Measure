"""
backend/services/scraper_service.py
Lazada product scraper using Selenium (headless Chrome).
Run standalone:  python -m services.scraper_service
Does NOT block Flask — runs in its own process/thread.
"""
import logging
import time
import threading
from services.db_service import save_products

logger = logging.getLogger(__name__)

# ─── Selenium imports (optional — degrade gracefully) ─────────────
try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    logger.warning("Selenium not installed. Scraper disabled.")


LAZADA_URL = "https://www.lazada.vn/catalog/?q=laptop&sort=priceasc"
PRODUCT_NAME_SELECTOR = "[data-tracking='product-card'] .RfADt"
PRODUCT_PRICE_SELECTOR = "[data-tracking='product-card'] .ooOxS"


def _build_driver() -> "webdriver.Chrome":
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1280,800")
    opts.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
    return webdriver.Chrome(options=opts)


def scrape_lazada(max_products: int = 30) -> list[dict]:
    """
    Scrape product names and prices from Lazada search results.
    Returns a list of dicts: [{"name": str, "price": str}, ...]
    """
    if not SELENIUM_AVAILABLE:
        logger.error("Selenium is not installed. Cannot scrape.")
        return []

    driver = None
    products = []
    try:
        driver = _build_driver()
        logger.info(f"Opening Lazada: {LAZADA_URL}")
        driver.get(LAZADA_URL)

        # Wait for product cards to appear (max 15s)
        WebDriverWait(driver, 15).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, PRODUCT_NAME_SELECTOR))
        )
        time.sleep(2)  # Let JS finish rendering

        name_els  = driver.find_elements(By.CSS_SELECTOR, PRODUCT_NAME_SELECTOR)
        price_els = driver.find_elements(By.CSS_SELECTOR, PRODUCT_PRICE_SELECTOR)

        for name_el, price_el in zip(name_els, price_els):
            if len(products) >= max_products:
                break
            name  = name_el.text.strip()
            price = price_el.text.strip()
            if name and price:
                products.append({"name": name, "price": price})

        logger.info(f"Scraped {len(products)} products from Lazada.")

    except Exception as e:
        logger.error(f"Scraper error: {e}")
    finally:
        if driver:
            driver.quit()

    return products


def run_scraper_and_save() -> None:
    """Full pipeline: scrape → save to DB."""
    logger.info("Scraper pipeline started.")
    products = scrape_lazada()
    if products:
        save_products(products)
        logger.info(f"Saved {len(products)} products to DB.")
    else:
        logger.warning("No products scraped — nothing saved.")


def run_scraper_in_background() -> None:
    """
    Launch scraper in a daemon thread so Flask startup is not blocked.
    Call this from app.py after create_app() if desired.
    """
    t = threading.Thread(target=run_scraper_and_save, daemon=True)
    t.start()
    logger.info("Background scraper thread started.")


# ─── Standalone entry point ───────────────────────────────────────
if __name__ == "__main__":
    import sys
    import os
    # Allow running from project root: python -m services.scraper_service
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    logging.basicConfig(level=logging.INFO)
    run_scraper_and_save()
