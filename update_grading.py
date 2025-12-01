import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import time
import pytz
import random
import os
tz = pytz.timezone('America/Los_Angeles')

def load_cache(cache_file):
    try:
        with open(cache_file, 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        return {}


def save_cache(data, cache_file):
    with open(cache_file, 'w') as file:
        json.dump(data, file, indent=4)


# Add a small list of user-agents to rotate to reduce 429s
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
]

def fetch_with_retries(session, url, max_attempts=6, timeout=20):
    """
    Fetch URL with retries and exponential backoff for 429 / 5xx responses.
    Honors Retry-After if present. Returns Response or None on failure.
    """
    for attempt in range(1, max_attempts + 1):
        try:
            resp = session.get(url, timeout=timeout)
        except Exception as e:
            wait = min(30, 2 ** attempt)
            print(f"  Request error for {url}: {e} — retrying in {wait}s (attempt {attempt}/{max_attempts})")
            time.sleep(wait + random.random())
            continue

        if resp.status_code == 200:
            return resp

        if resp.status_code == 429:
            retry_after = resp.headers.get('Retry-After')
            if retry_after and retry_after.isdigit():
                wait = int(retry_after) + 1
            else:
                wait = min(60, 2 ** attempt)
            print(f"  429 for {url} — retrying in {wait}s (attempt {attempt}/{max_attempts})")
            time.sleep(wait + random.random())
            continue

        if 500 <= resp.status_code < 600:
            wait = min(30, 2 ** attempt)
            print(f"  Server error {resp.status_code} for {url} — retrying in {wait}s (attempt {attempt}/{max_attempts})")
            time.sleep(wait + random.random())
            continue

        # other non-200 codes: return response for caller to decide
        print(f"  Non-200 status {resp.status_code} for {url}")
        return resp

    print(f"  Failed to fetch {url} after {max_attempts} attempts")
    return None

def scrape_set_prices(set_name):
  print(f"Scraping prices for set: {set_name}")
  # rotate UA for each set
  session.headers['User-Agent'] = random.choice(USER_AGENTS)
  session.headers['Accept-Language'] = 'en-US,en;q=0.9'
  set_url = f"https://www.pricecharting.com/console/pokemon-{set_name}?sort=highest-graded-price&exclude-variants=true"
  response = fetch_with_retries(session, set_url)
  if not response:
      print(f"  Skipping set {set_name} due to repeated fetch failures.")
      return {}

  if response.status_code != 200:
    print(f"  Non-200 status for {set_name}: {response.status_code}")
    return {}

  set_soup = BeautifulSoup(response.content, 'html.parser')

  # Find card title cells and extract per-card link from the anchor inside the title cell.
  card_cells = set_soup.find_all('td', class_='title')
  return_dict = {}
  for cell in card_cells:
    a = cell.find('a', href=True)
    if not a:
      continue
    card_name_and_number = a.text.strip()
    href = a['href'].strip()
    # Normalize URL
    if href.startswith('/'):
      card_url = f"https://www.pricecharting.com{href}"
    elif href.startswith('http'):
      card_url = href
    else:
      card_url = f"https://www.pricecharting.com/{href}"

    # rotate UA before each card request (slight variation)
    session.headers['User-Agent'] = random.choice(USER_AGENTS)

    # Fetch individual card page with safe parsing and retries
    card_resp = fetch_with_retries(session, card_url)
    if not card_resp or card_resp.status_code != 200:
      # skip if cannot fetch
      continue
    try:
      card_soup = BeautifulSoup(card_resp.content, 'html.parser')

      # Sales frequency cells
      td_tags = card_soup.find_all('td', class_='js-show-tab tablet-portrait-hidden')
      sales_frequencies = []
      for td in td_tags:
        link_tag = td.find('a')
        sales_frequencies.append(link_tag.text.strip() if link_tag and link_tag.text else '')

      # Ungraded price (used price td)
      price_ungraded = None
      td_used = card_soup.find('td', id='used_price')
      if td_used:
        sp = td_used.find('span')
        if sp and sp.text:
          price_ungraded = sp.text.strip()

      # Find grade prices by inspecting spans with class price js-price and checking title attribute.
      price_grade_9 = None
      price_grade_10 = None
      for sp in card_soup.find_all('span', class_='price js-price'):
        title = (sp.get('title') or '').lower()
        text = sp.text.strip()
        if 'graded condition' in title and not price_grade_9:
          price_grade_9 = text
        elif 'manual' in title or 'manual only' in title:
          price_grade_10 = text

      # Defensive check and parse floats
      if price_ungraded and price_grade_9 and price_grade_10 and len(sales_frequencies) >= 1:
        try:
          ungraded_val = float(price_ungraded.replace('$', '').replace(',', ''))
          grade9_val = float(price_grade_9.replace('$', '').replace(',', ''))
          grade10_val = float(price_grade_10.replace('$', '').replace(',', ''))
          return_dict[card_name_and_number] = {
            'link': card_url,
            'grade_9_freq': sales_frequencies[0],
            'grade_10_freq': sales_frequencies[2] if len(sales_frequencies) >= 3 else sales_frequencies[-1],
            'ungraded': ungraded_val,
            'grade_9': grade9_val,
            'grade_10': grade10_val
          }
        except Exception:
          # parsing float failed, skip this card
          continue

    except Exception as e:
      print(f"  Error parsing card page {card_name_and_number} ({card_url}): {e}")
      continue

    # polite delay between card requests to reduce rate-limit risk
    time.sleep(0.7 + random.random() * 0.6)

  print(f"  Scraped {len(return_dict)} cards for {set_name}")
  return return_dict

cache_file = 'assets/sets_price_data.json'
cache = load_cache(cache_file)
today = datetime.now(tz).strftime('%Y-%m-%d')
all_set_data = {}

if cache.get('last_run_date') == today:
    print("Cache is up to date.")
    exit()

diff_price_threshold = 20
session = requests.Session()
session.headers.update({
    'User-Agent': random.choice(USER_AGENTS),
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Accept-Language': 'en-US,en;q=0.9'
})


with open('assets/sets.json', 'r') as file:
    sets = json.load(file)
    
print("Updating cache with new data...")

for set_name in sets.keys():
    try:
        start = time.time()
        all_set_data[set_name] = scrape_set_prices(set_name)
        end = time.time()
        print(f"{sets[set_name]} took {end - start} seconds.")
        # larger polite delay between sets
        time.sleep(1.2 + random.random() * 0.8)
    except Exception as e:
        print(f"Error processing set {set_name}: {e}")
        all_set_data[set_name] = {}

# Save updated data
cache['last_run_date'] = today
cache['sets_data'] = all_set_data
save_cache(cache, cache_file)
print(f"Grading data updated successfully for {datetime.now(tz).strftime('%Y-%m-%d')}.")

# display_list = []
# for set_name, cards in all_set_data.items():
#     for card, prices in cards.items():
#         if prices['grade_9'] - prices['ungraded'] > diff_price_threshold:
#           display_list.append((set_name, card, prices))
        
# display_list.sort(key=lambda x: -x[2]['ungraded'] + x[2]['grade_9'], reverse=True)
# for set_name, card, prices in display_list:
#   print(f"{card} ({sets[set_name]}): ${prices['ungraded']} ungraded, ${prices['grade_9']} PSA 9, ${prices['grade_10']} PSA 10")