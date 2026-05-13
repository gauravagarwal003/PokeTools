import csv
from datetime import datetime
import requests
import os
import pytz
import time
tz = pytz.timezone('America/Los_Angeles')

urlBySet = {}
session = requests.Session()
session.headers.update({
    # TCGCSV blocks the default python-requests User-Agent.
    'User-Agent': 'PokeMap/1.0 (https://pokemap.org; contact: gagarwal003@gmail.com)',
    'Accept': 'text/csv,*/*',
})

# populate the urlBySet dictionary from the CSV file
with open('assets/set_info.csv', newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        set_name = row['Set']
        urlBySet[set_name] = row['ID']

# Create the 'prices' folder if it doesn't exist
if not os.path.exists('prices'):
    os.makedirs('prices')


def fetch_csv(url, max_attempts=4, timeout=30):
    for attempt in range(1, max_attempts + 1):
        try:
            response = session.get(url, timeout=timeout)
        except requests.RequestException as exc:
            response = None
            print(f"Attempt {attempt}/{max_attempts} failed for {url}: {exc}")

        if response is not None and response.status_code == 200:
            return response.text

        if response is not None:
            print(
                f"Attempt {attempt}/{max_attempts} failed for {url} "
                f"with status {response.status_code}: {response.text[:160]}"
            )

        if attempt < max_attempts:
            time.sleep(min(2 ** attempt, 10))

    return None


# Loop through the urlBySet dictionary and fetch data
for set in urlBySet:
    url = f"https://tcgcsv.com/tcgplayer/3/{urlBySet[set]}/ProductsAndPrices.csv"
    csv_text = fetch_csv(url)
    if csv_text is None:
        print(f"Failed to retrieve the CSV file for {set}.")
        exit(1)

    file_path = f'assets/set_prices/{set}.csv'
    tmp_path = f'{file_path}.tmp'
    with open(tmp_path, 'w', newline='', encoding='utf-8') as f:
        f.write(csv_text)
    os.replace(tmp_path, file_path)
        
print(f"Expected values updated successfully for {datetime.now(tz).strftime('%Y-%m-%d')}")
exit(0)
