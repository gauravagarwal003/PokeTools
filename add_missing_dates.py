# FOR MISSING DAYS FOR PACK AND EV POKEMON SETS
import pandas as pd
import os
import json
import csv

start_date = "2025-07-18"
end_date = "2025-07-21"

rarities = {'Double Rare': 57, 'Secret Rare': 274, 'Illustration Rare': 848, 'Special Illustration Rare': 1120, 'Master Ball Pattern': 2802, 'Poke Ball Pattern': 488, 'Black White Rare': 1400}
black = {key: [] for key in rarities}
white = {key: [] for key in rarities}

with open(f'bb.csv', 'r') as file:
    csv_reader = csv.DictReader(file)
    for row in csv_reader:
        if not row['extNumber'].isspace():
            if row['marketPrice'] or row['lowPrice']:       
                if row['extRarity'] in rarities: 
                    black[row['extRarity']].append(row['productId'])
                else:
                    masterBallPattern = 'Master Ball Pattern'
                    pokeBallPattern = 'Poke Ball Pattern'
                    if masterBallPattern in row['name']:
                        black[masterBallPattern].append(row['productId'])   
                    elif pokeBallPattern in row['name']:
                        black[pokeBallPattern].append(row['productId'])

with open(f'wf.csv', 'r') as file:
    csv_reader = csv.DictReader(file)
    for row in csv_reader:
        if not row['extNumber'].isspace():
            if row['marketPrice'] or row['lowPrice']:       
                if row['extRarity'] in rarities: 
                    white[row['extRarity']].append(row['productId'])
                else:
                    masterBallPattern = 'Master Ball Pattern'
                    pokeBallPattern = 'Poke Ball Pattern'
                    if masterBallPattern in row['name']:
                        white[masterBallPattern].append(row['productId'])   
                    elif pokeBallPattern in row['name']:
                        white[pokeBallPattern].append(row['productId'])

# Example: Find the key in 'black' or 'white' dicts that contains a specific productId
def find_key_with_value(d, value):
    for key, values in d.items():
        if str(value) in values:
            return key
    return None

black_pack = 630434
white_pack = 630699

for date_with_time in pd.date_range(start=start_date, end=end_date):
    sum = 0
    pack_price = 0
    date = date_with_time.date()
    file_path = f"{date}/3/24325/prices"
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'r') as file:
        parsed_data = json.load(file)['results']
    for item in parsed_data:
        if item['productId'] == black_pack:
            pack_price = item['marketPrice']
        elif item['marketPrice'] and item['marketPrice'] >= 1:
            rarity_key = find_key_with_value(black, item['productId'])
            if rarity_key:
                sum += item['marketPrice'] / rarities[rarity_key]
        elif item['lowPrice'] and item['lowPrice'] >= 1:
            rarity_key = find_key_with_value(black, item['productId'])
            if rarity_key:
                sum += item['lowPrice'] / rarities[rarity_key]
    print(f"Black sum for {date}: {sum}")
    print(f"Black pack price for {date}: {pack_price}")

for date_with_time in pd.date_range(start=start_date, end=end_date):
    sum = 0
    date = date_with_time.date()
    file_path = f"{date}/3/24326/prices"
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, 'r') as file:
        parsed_data = json.load(file)['results']
    for item in parsed_data:
        if item['productId'] == white_pack:
            pack_price = item['marketPrice']
        elif item['marketPrice'] and item['marketPrice'] >= 1:
            rarity_key = find_key_with_value(white, item['productId'])
            if rarity_key:
                sum += item['marketPrice'] / rarities[rarity_key]
        elif item['lowPrice'] and item['lowPrice'] >= 1:
            rarity_key = find_key_with_value(white, item['productId'])
            if rarity_key:
                sum += item['lowPrice'] / rarities[rarity_key]

    print(f"White sum for {date}: {sum}")
    print(f"White pack price for {date}: {pack_price}")

