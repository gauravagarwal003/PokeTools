import os
import time
from collections import Counter
from datetime import datetime

import geojson
import pandas as pd
import pytz
import requests

tz = pytz.timezone('America/Los_Angeles')

API_URL = 'https://api.vending.prod.pokemon.com/v1/machines'
TIMESTAMP_PATH = 'assets/vending_data/timestamps.csv'
ALLSTATES_PATH = 'assets/all_states.csv'
STATES_DIR = 'assets/vending_data/states'
REQUEST_DELAY_SECONDS = 1.0
MAX_RESULTS_PER_BOX = 20
MAX_DEPTH = 8
MIN_BOX_SIZE = 0.08

os.makedirs(STATES_DIR, exist_ok=True)

STATE_BOUNDS = {
    'AL': (30.1, -88.5, 35.1, -84.8),
    'AK': (51.2, -179.2, 71.4, -129.9),
    'AZ': (31.3, -114.9, 37.1, -109.0),
    'AR': (33.0, -94.7, 36.6, -89.6),
    'CA': (32.5, -124.5, 42.1, -114.1),
    'CO': (36.9, -109.1, 41.1, -102.0),
    'CT': (40.9, -73.8, 42.1, -71.7),
    'DC': (38.7, -77.2, 39.0, -76.8),
    'DE': (38.4, -75.8, 39.9, -75.0),
    'FL': (24.4, -87.7, 31.1, -80.0),
    'GA': (30.3, -85.7, 35.1, -80.8),
    'HI': (18.8, -160.3, 22.3, -154.7),
    'IA': (40.3, -96.7, 43.6, -90.1),
    'ID': (42.0, -117.3, 49.1, -111.0),
    'IL': (36.9, -91.6, 42.6, -87.0),
    'IN': (37.7, -88.2, 41.8, -84.7),
    'KS': (36.9, -102.1, 40.1, -94.5),
    'KY': (36.4, -89.6, 39.2, -81.9),
    'LA': (28.8, -94.1, 33.1, -88.7),
    'MA': (41.1, -73.6, 42.9, -69.8),
    'MD': (37.8, -79.6, 39.8, -75.0),
    'ME': (42.9, -71.2, 47.5, -66.8),
    'MI': (41.7, -90.5, 48.4, -82.1),
    'MN': (43.4, -97.3, 49.4, -89.5),
    'MO': (35.9, -95.8, 40.7, -89.0),
    'MS': (30.1, -91.7, 35.1, -88.1),
    'MT': (44.3, -116.1, 49.1, -104.0),
    'NC': (33.8, -84.4, 36.7, -75.4),
    'ND': (45.9, -104.1, 49.1, -96.5),
    'NE': (39.9, -104.1, 43.1, -95.3),
    'NH': (42.6, -72.6, 45.4, -70.6),
    'NJ': (38.8, -75.6, 41.4, -73.8),
    'NM': (31.3, -109.1, 37.1, -103.0),
    'NV': (35.0, -120.1, 42.1, -114.0),
    'NY': (40.4, -79.8, 45.1, -71.8),
    'OH': (38.3, -84.9, 42.4, -80.5),
    'OK': (33.6, -103.1, 37.1, -94.4),
    'OR': (41.9, -124.7, 46.4, -116.4),
    'PA': (39.6, -80.6, 42.6, -74.6),
    'RI': (41.1, -71.9, 42.1, -71.0),
    'SC': (32.0, -83.4, 35.3, -78.5),
    'SD': (42.4, -104.1, 45.9, -96.4),
    'TN': (34.9, -90.4, 36.8, -81.6),
    'TX': (25.8, -106.7, 36.6, -93.5),
    'UT': (36.9, -114.1, 42.1, -109.0),
    'VA': (36.5, -83.8, 39.5, -75.2),
    'VT': (42.7, -73.5, 45.1, -71.4),
    'WA': (45.5, -124.9, 49.1, -116.9),
    'WI': (42.4, -92.9, 47.2, -86.8),
    'WV': (37.1, -82.7, 40.7, -77.7),
    'WY': (40.9, -111.1, 45.1, -104.0),
}

session = requests.Session()
session.headers.update({
    'User-Agent': 'PokeMap/1.0 (https://pokemap.org; contact: gagarwal003@gmail.com)',
    'Accept': 'application/json',
})


def fetch_machines(sw_lat, sw_lng, ne_lat, ne_lng, max_attempts=4):
    params = {
        'swLat': sw_lat,
        'swLng': sw_lng,
        'neLat': ne_lat,
        'neLng': ne_lng,
        'unit': 'Mi',
    }

    for attempt in range(1, max_attempts + 1):
        time.sleep(REQUEST_DELAY_SECONDS)
        response = session.get(API_URL, params=params, timeout=30)
        if response.status_code == 200:
            data = response.json()
            machines = data.get('machines')
            if not isinstance(machines, list):
                raise RuntimeError(f"Unexpected vending API response: {data}")
            return machines

        if response.status_code in {403, 429} or 500 <= response.status_code < 600:
            wait_seconds = min(60, 5 * attempt)
            print(
                f"Vending API returned {response.status_code} for {params}; "
                f"retrying in {wait_seconds}s ({attempt}/{max_attempts})"
            )
            time.sleep(wait_seconds)
            continue

        response.raise_for_status()

    raise RuntimeError(f"Vending API failed after {max_attempts} attempts for {params}")


def collect_box(sw_lat, sw_lng, ne_lat, ne_lng, depth=0):
    machines = fetch_machines(sw_lat, sw_lng, ne_lat, ne_lng)
    lat_span = ne_lat - sw_lat
    lng_span = ne_lng - sw_lng

    if (
        len(machines) < MAX_RESULTS_PER_BOX
        or depth >= MAX_DEPTH
        or lat_span <= MIN_BOX_SIZE
        or lng_span <= MIN_BOX_SIZE
    ):
        return {machine['id']: machine for machine in machines}

    mid_lat = (sw_lat + ne_lat) / 2
    mid_lng = (sw_lng + ne_lng) / 2
    collected = {}
    for bounds in (
        (sw_lat, sw_lng, mid_lat, mid_lng),
        (sw_lat, mid_lng, mid_lat, ne_lng),
        (mid_lat, sw_lng, ne_lat, mid_lng),
        (mid_lat, mid_lng, ne_lat, ne_lng),
    ):
        collected.update(collect_box(*bounds, depth + 1))
    return collected


def load_existing_machine_ids():
    if not os.path.exists(ALLSTATES_PATH):
        return set()
    df = pd.read_csv(ALLSTATES_PATH)
    if 'Machine ID' not in df.columns:
        return set()
    return set(df['Machine ID'].dropna().astype(str))


def machine_to_row(machine):
    city_state = f"{machine['city']}, {machine['stateProvince']}"
    full_address = f"{machine['street']}, {city_state}"
    return {
        'Retailer': machine['retailer'],
        'Machine ID': machine['name'],
        'Address': machine['city'],
        'Cities': city_state,
        'Full Address': full_address,
        'Longitude': machine['lng'],
        'Latitude': machine['lat'],
    }


def write_state_files(machines):
    rows_by_state = {}
    for machine in machines.values():
        if machine.get('country') != 'US':
            continue
        state = machine.get('stateProvince')
        if not state:
            continue
        rows_by_state.setdefault(state, []).append(machine_to_row(machine))

    if not rows_by_state:
        raise RuntimeError('Vending API returned no US machines.')

    for state, rows in rows_by_state.items():
        df = pd.DataFrame(rows).sort_values(['Cities', 'Retailer', 'Machine ID'])
        df.to_csv(os.path.join(STATES_DIR, f'{state}.csv'), index=False)

    return rows_by_state


def update_all_states():
    all_dfs = []
    for filename in os.listdir(STATES_DIR):
        if filename.endswith('.csv'):
            state_initial = filename.split('.')[0].upper()
            file_path = os.path.join(STATES_DIR, filename)
            df = pd.read_csv(file_path)
            df['State'] = state_initial
            all_dfs.append(df)

    if not all_dfs:
        raise RuntimeError('No state CSV files found after vending update.')

    combined_df = pd.concat(all_dfs, ignore_index=True)
    combined_df.to_csv(ALLSTATES_PATH, index=False)
    return combined_df


def save_timestamps(states):
    run_timestamp = datetime.now(tz).strftime('%Y-%m-%dT%H:%M:%S%z')
    df = pd.DataFrame(
        [{'State': state, 'Last Updated': run_timestamp} for state in sorted(states)]
    )
    df.to_csv(TIMESTAMP_PATH, index=False)


def write_geojson(df):
    def create_feature(row):
        return geojson.Feature(
            geometry=geojson.Point((float(row['Longitude']), float(row['Latitude']))),
            properties={
                'Retailer': row['Retailer'],
                'Address': row['Full Address'],
            },
        )

    features = [create_feature(row) for _, row in df.iterrows()]
    with open('assets/all_states.geojson', 'w') as f:
        geojson.dump(geojson.FeatureCollection(features), f, indent=2)


def main():
    existing_machine_ids = load_existing_machine_ids()
    all_machines = {}

    for state, bounds in STATE_BOUNDS.items():
        state_machines = collect_box(*bounds)
        if state_machines:
            print(f"{state}: found {len(state_machines)} machines")
        all_machines.update(state_machines)

    rows_by_state = write_state_files(all_machines)
    combined_df = update_all_states()
    save_timestamps(rows_by_state.keys())
    write_geojson(combined_df)

    new_machine_ids = {machine['name'] for machine in all_machines.values()}
    added = new_machine_ids - existing_machine_ids
    removed = existing_machine_ids - new_machine_ids

    print(f"For date {datetime.now(tz).strftime('%Y-%m-%d')}")
    print(f"States with machines: {', '.join(sorted(rows_by_state.keys()))}")
    print(f"Total machines: {len(new_machine_ids)}")
    print(f"New machines: {len(added)}")
    print(f"Removed machines: {len(removed)}")
    print("Machines by state:")
    for state, count in sorted(Counter(machine['stateProvince'] for machine in all_machines.values()).items()):
        print(f"  {state}: {count}")


if __name__ == '__main__':
    main()
