from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import time
import re
from pandas import DataFrame, read_csv
import pandas as pd
import os
from fake_useragent import UserAgent
import googlemaps
from dotenv import load_dotenv
import geojson

# Regex pattern to match state names (with hyphens/spaces)
state_abbreviations = {
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new-hampshire": "NH",
    "new-jersey": "NJ",
    "new-mexico": "NM",
    "new-york": "NY",
    "north-carolina": "NC",
    "north-dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode-island": "RI",
    "south-carolina": "SC",
    "south-dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY",
    "district-of-columbia": "DC",
}
state_pattern = re.compile(
    r'\b(' + '|'.join(
        [s.replace(' ', r'[\s-]+') for s in state_abbreviations.keys()]
    ) + r')\b', 
    re.IGNORECASE
)

# paths
TIMESTAMP_PATH = 'assets/vending_data/timestamps.csv'
ALLSTATES_PATH = 'assets/all_states.csv'
STATES_DIR = 'assets/vending_data/states'
# make sure directories exist
os.makedirs(STATES_DIR, exist_ok=True)
os.makedirs(ALLSTATES_PATH, exist_ok=True)
os.makedirs(STATES_DIR, exist_ok=True)
load_dotenv()  
api_key = os.getenv("API_KEY")
gmaps = googlemaps.Client(key=api_key)
api_called = 0

def get_lat_lon_from_address(full_address):
    global api_called
    api_called += 1
    try:
        geocode_result = gmaps.geocode(full_address)
        if not geocode_result:  # no results
            print(f"No geocode result for: {full_address}")
            return None, None
        
        location = geocode_result[0]['geometry']['location']
        lat, lng = location['lat'], location['lng']
        return lat, lng
    except Exception as e:
        print(f"Error geocoding address '{full_address}': {e}")
        return None, None

def scrape(url, sleep_time):
    ua = UserAgent()
    user_agent = ua.random

    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument(f"user-agent={user_agent}")
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)

    try:
        driver.get(url)
        time.sleep(sleep_time)
        return driver.page_source
    except Exception as e:
        print(f"Error occurred: {e}")
        return None
    finally:
        driver.quit()

def get_timestamps():
    if os.path.exists(TIMESTAMP_PATH):
        return read_csv(TIMESTAMP_PATH, index_col='State').to_dict()['Last Updated']
    return {}

def save_timestamps(timestamps):
    df = DataFrame(list(timestamps.items()), columns=['State', 'Last Updated'])
    df.to_csv(TIMESTAMP_PATH, index=False)

def update_state(retailers, iDs, addresses, cities, fullAddresses, state_initial):
    new_data = {
        'Retailer': retailers,
        'Machine ID': iDs,
        'Address': addresses,
        'Cities': cities,
        'Full Address': fullAddresses
    }
    new_df = pd.DataFrame(new_data)
    file_path = os.path.join(STATES_DIR, f"{state_initial}.csv")
    
    if os.path.exists(file_path):
        existing_df = pd.read_csv(file_path)
    else:
        existing_df = pd.DataFrame(columns=[
            'Retailer', 'Machine ID', 'Address', 'Cities', 'Full Address',
            'Longitude', 'Latitude'
        ])

    # Ensure Longitude/Latitude columns exist in both DataFrames
    for col in ['Longitude', 'Latitude']:
        if col not in existing_df.columns:
            existing_df[col] = None
    new_df['Longitude'] = None
    new_df['Latitude'] = None

    # Use existing geocoding data if available
    existing_addresses = set(existing_df['Full Address'])
    for idx, row in new_df.iterrows():
        address = row['Full Address']
        if address in existing_addresses:
            matching_row = existing_df[existing_df['Full Address'] == address].iloc[0]
            new_df.at[idx, 'Longitude'] = matching_row['Longitude']
            new_df.at[idx, 'Latitude']  = matching_row['Latitude']
        else:
            lon, lat = get_lat_lon_from_address(address)
            new_df.at[idx, 'Longitude'] = lon
            new_df.at[idx, 'Latitude']  = lat

    # Save only the new data (with updated geocoding) to the CSV,
    # effectively removing any addresses not present in the new data.
    new_df.to_csv(file_path, index=False)

# def update_state(retailers, iDs, addresses, cities, fullAddresses, state_initial):
#     my_dict = {
#         'Retailer': retailers,
#         'Machine ID': iDs,
#         'Address': addresses,
#         'Cities': cities,
#         'Full Address': fullAddresses
#     }
#     df = DataFrame(my_dict)
#     df.to_csv(f"{STATES_DIR}/{state_initial}.csv", index=False)

def update_all_states():
    all_dfs = []
    for filename in os.listdir(STATES_DIR):
        if filename.endswith('.csv'):
            state_initial = filename.split('.')[0].upper()
            file_path = os.path.join(STATES_DIR, filename)
            df = pd.read_csv(file_path)
            df['State'] = state_initial
            all_dfs.append(df)

    combined_df = pd.concat(all_dfs, ignore_index=True)
    combined_df.to_csv(ALLSTATES_PATH, index=False)

base_url = "https://support.pokemoncenter.com/hc/en-us/sections/13360842288916-Pok%C3%A9mon-Automated-Retail-Vending-Machines"
all_data = scrape(base_url, 2)

if not all_data:
    print("No data found")
    exit()

newStates, updatedStates, sameStates = [], [], []
stored_timestamps = get_timestamps()
base_soup = BeautifulSoup(all_data, 'html.parser')
data_updated = False  # flag to check if any state data is updated

for tag in base_soup.find_all('a', class_='article-list-link'):
    link = tag.get('href') # link to state's page
    if link is None:
        print("No link found")
        continue
    
    if not link.startswith('http'):
        link = f"https://support.pokemoncenter.com{link}"
        
    if state_pattern.search(link) is None:
        print(f"Skipping {link}")
        continue
    
    individual_data = scrape(link, 2)
    if individual_data is None:
        print(f"No data found for {link}")
        continue 
    
    individual_soup = BeautifulSoup(individual_data, 'html.parser')
    time_last_updated_tag = individual_soup.find('time')
    if time_last_updated_tag is None:
        print(f"No timestamp found on page for {link}")
        continue
    
    state_initial = state_abbreviations[state_pattern.search(link).group(0).title().lower()] # extract state from link
    time_last_updated = time_last_updated_tag.get('datetime')        
    if state_initial not in stored_timestamps:
        newStates.append(state_initial)
    elif time_last_updated <= stored_timestamps[state_initial]:
        sameStates.append(state_initial)
        continue
    else:
        updatedStates.append(state_initial)
        
    rows = individual_soup.find_all('tr')
    if len(rows) < 2:
        print(f"No data rows found for {link}")
        continue
    
    stored_timestamps[state_initial] = time_last_updated
    data_updated = True
    retailers = []
    iDs = []
    addresses = []
    cities = []
    fullAddresses = []

    for row in rows[1:]:
        cells = row.find_all('td')
        if len(cells) < 4:
            continue
        retailer = cells[0].text.strip()
        store_id = cells[1].text.strip()
        address = cells[2].text.strip()
        city_state = cells[3].text.strip()
        city, state = city_state.split(", ", 1)
        fullAddress = f"{address}, {city}, {state}"
        
        retailers.append(retailer)
        iDs.append(store_id)
        addresses.append(city)
        cities.append(city_state)
        fullAddresses.append(fullAddress)
        
    update_state(retailers, iDs, addresses, cities, fullAddresses, state_initial)

if data_updated:
    update_all_states()
    save_timestamps(stored_timestamps)

if newStates:
    print(f"New states: {', '.join(newStates)}")
else:
    print("No new states")

if updatedStates:
    print(f"Updated data for {', '.join(updatedStates)}")
else:
    print("No updated states")

if sameStates:
    print(f"No updated data found for {', '.join(sameStates)}")
else:
    print("No states with same data")

print("API calls: ", api_called)    

# Load CSV data into a pandas DataFrame
df = pd.read_csv(ALLSTATES_PATH)
def create_feature(row):
    lon, lat = float(row['Longitude']), float(row['Latitude'])
    retailer = row['Retailer']
    address = row['Full Address']
    properties = {
        'Retailer': retailer,
        'Address': address,
    }

    return geojson.Feature(
        geometry=geojson.Point((lat, lon)),  # GeoJSON Point geometry
        properties=properties,  # Attach all properties
    )

features = [feature for _, row in df.iterrows() if (feature := create_feature(row))]

feature_collection = geojson.FeatureCollection(features)

with open('assets/all_states.geojson', 'w') as f:
    geojson.dump(feature_collection, f, indent=2)  # Pretty-print JSON output