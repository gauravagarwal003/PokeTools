import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import time

def load_cache(cache_file):
    try:
        with open(cache_file, 'r') as file:
            return json.load(file)
    except FileNotFoundError:
        return {}


def save_cache(data, cache_file):
    with open(cache_file, 'w') as file:
        json.dump(data, file, indent=4)


def scrape_set_prices(set_name):
  set_url = f"https://www.pricecharting.com/console/pokemon-{set_name}?sort=highest-graded-price&exclude-variants=true"
  response = session.get(set_url)
  set_soup = BeautifulSoup(response.content, 'html.parser')
  card_names = set_soup.find_all('td', class_='title')
  card_urls = set_soup.find_all('a', href=lambda x: x and x.startswith('https://www.pricecharting.com/game/pokemon-'))
  card_urls = [link['href'] for link in card_urls if 'href' in link.attrs]
  return_dict = {}
  for index, card in enumerate(card_names):
    card_name_and_number = card.a.text.strip()
    if '#' in card_name_and_number:
      card_response = session.get(card_urls[index])
      card_soup = BeautifulSoup(card_response.content, 'html.parser')
      td_tags = card_soup.find_all('td', class_='js-show-tab tablet-portrait-hidden')
      sales_frequencies = [td.find('a').text for td in td_tags]
      if len(sales_frequencies) == 3:
        if 'per day' in sales_frequencies[0] or 'per week' in sales_frequencies[0]:
            if 'per day' in sales_frequencies[2] or 'per week' in sales_frequencies[2]:
                td = card_soup.find('td', {'id': 'used_price'})
                if td:
                    price_ungraded = td.find('span').text.strip()
                price_grade_9 = card_soup.find('span', {'class': 'price js-price', 'title': 'current value in Graded condition'}).text.strip()
                price_grade_10 = card_soup.find('span', {'class': 'price js-price', 'title': 'current Manual Only value'}).text.strip()
                return_dict[card_name_and_number] = {'link': card_urls[index],'grade_9_freq': sales_frequencies[0], 'grade_10_freq': sales_frequencies[2], 'ungraded': float(price_ungraded[1:].replace(',', '')), 'grade_9': float(price_grade_9[1:].replace(',', '')), 'grade_10': float(price_grade_10[1:].replace(',', ''))}
                
  return return_dict

cache_file = 'price_data_cache.json'
cache = load_cache(cache_file)
today = datetime.now().strftime('%Y-%m-%d')
all_set_data = {}

if cache.get('last_run_date') == today:
    print("Cache is up to date.")
    exit()

diff_price_threshold = 20
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
})


with open('assets/sets.json', 'r') as file:
    sets = json.load(file)
    
print("Updating cache with new data...")

for set_name in sets.keys():
    start = time.time() 
    all_set_data[set_name] = scrape_set_prices(set_name)
    end = time.time()
    print(f"{sets[set_name]} took {end - start} seconds.")    
    

# Save updated data
cache['last_run_date'] = today
cache['sets_data'] = all_set_data
save_cache(cache, cache_file)

# display_list = []
# for set_name, cards in all_set_data.items():
#     for card, prices in cards.items():
#         if prices['grade_9'] - prices['ungraded'] > diff_price_threshold:
#           display_list.append((set_name, card, prices))
        
# display_list.sort(key=lambda x: -x[2]['ungraded'] + x[2]['grade_9'], reverse=True)
# for set_name, card, prices in display_list:
#   print(f"{card} ({sets[set_name]}): ${prices['ungraded']} ungraded, ${prices['grade_9']} PSA 9, ${prices['grade_10']} PSA 10")