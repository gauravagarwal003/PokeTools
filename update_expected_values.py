import csv
from datetime import datetime
import os
import pandas as pd
import pytz
tz = pytz.timezone('America/Los_Angeles')


def clean_and_convert_dict(d):
    cleaned_dict = {}
    for key, value in d.items():
        if value != "":
            cleaned_dict[key] = int(value)
    return cleaned_dict

def csv_is_up_to_date(csv_filename):
    df = pd.read_csv(csv_filename)
    last_update_date = df["Date"].max()
    current_date = datetime.datetime.now(tz).strftime('%Y-%m-%d')

    if last_update_date == current_date:
        return True
    else:
        return False

EV_FILE_NAME = "assets/sv_packs_expected_value.csv"
if csv_is_up_to_date(EV_FILE_NAME):
    print(f"Expected values are already up to date for {datetime.datetime.now(tz).strftime('%Y-%m-%d')}")
    exit(0)


pricesBySet = {}
rarityProbabilitiesBySet = {}

with open('assets/set_info.csv', 'r') as file:
    csv_reader = csv.DictReader(file)
    for row in csv_reader:
        setName = row['Set']
        del row['Set']
        del row['Color']
        del row['ID']
        rarityProbabilitiesBySet[setName] = clean_and_convert_dict(row)

for setName in rarityProbabilitiesBySet:
    sum = 0
    with open(f'assets/set_prices/{setName}.csv', 'r') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            if not row['extNumber'].isspace():
                if row['marketPrice'] and float(row['marketPrice']) > 1:       
                    if row['extRarity'] in rarityProbabilitiesBySet[setName]: 
                        sum += float(row['marketPrice']) / rarityProbabilitiesBySet[setName][row['extRarity']]
                    else:
                        masterBallPattern = 'Master Ball Pattern'
                        pokeBallPattern = 'Poke Ball Pattern'
                        if masterBallPattern in row['name']:
                            sum += float(row['marketPrice']) / rarityProbabilitiesBySet[setName][masterBallPattern]    
                        elif pokeBallPattern in row['name']:
                            sum += float(row['marketPrice']) / rarityProbabilitiesBySet[setName][pokeBallPattern]
    
    pricesBySet[setName] = round(sum,2)
    
current_date = datetime.datetime.now(tz).strftime('%Y-%m-%d')
file_exists = False
try:
    with open(EV_FILE_NAME, mode='r', newline='') as file:
        file_exists = True
except FileNotFoundError:
    print("File not found. Creating a new file.")
    file_exists = False

needToAddNewLine = False
with open(EV_FILE_NAME, mode='rb') as file:
    file.seek(-1, os.SEEK_END)
    last_char = file.read(1)
    if last_char != b'\n':
        needToAddNewLine = True

with open(EV_FILE_NAME, mode='a', newline='') as file:
    writer = csv.writer(file)
    if not file_exists:
        header = ['Date'] + list(pricesBySet.keys())
        writer.writerow(header)

    if needToAddNewLine:
        file.write('\n')

    row = [current_date] + list(pricesBySet.values())
    writer.writerow(row)

print(f"Expected values updated for {current_date}")
exit(0)