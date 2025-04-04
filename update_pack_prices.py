import csv
from datetime import datetime
import os
import pandas as pd
import pytz
tz = pytz.timezone('America/Los_Angeles')


def csv_is_up_to_date(csv_filename):
    df = pd.read_csv(csv_filename)
    last_update_date = df["Date"].max()
    current_date = datetime.now(tz).strftime('%Y-%m-%d')

    if last_update_date == current_date:
        return True
    else:
        return False

PACK_PRICES_FILE_NAME = "assets/sv_pack_prices.csv"
if csv_is_up_to_date(PACK_PRICES_FILE_NAME):
    print(f"Pack prices are already up to date for {datetime.now(tz).strftime('%Y-%m-%d')}")
    exit(0)

sets = []
pack_prices = {}

with open('assets/set_info.csv', 'r') as file:
    csv_reader = csv.DictReader(file)
    for row in csv_reader:
        sets.append(row['Set'])

for setName in sets:
    with open(f'assets/set_prices/{setName}.csv', 'r') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            if not row['extNumber'].isspace():
                if row['marketPrice'] and float(row['marketPrice']) > 0:     
                    if setName == "Scarlet & Violet Base Set" and row['cleanName'] == "Scarlet and Violet Booster Pack":  
                        pack_prices[setName] = round(float(row['marketPrice']),2)
                    if row['cleanName'] == f"{setName} Booster Pack": 
                        pack_prices[setName] = round(float(row['marketPrice']),2)    
                        
    
current_date = datetime.now(tz).strftime('%Y-%m-%d')
file_exists = False
try:
    with open(PACK_PRICES_FILE_NAME, mode='r', newline='') as file:
        file_exists = True
except FileNotFoundError:
    print("File not found. Creating a new file.")
    file_exists = False

needToAddNewLine = False
with open(PACK_PRICES_FILE_NAME, mode='rb') as file:
    file.seek(-1, os.SEEK_END)
    last_char = file.read(1)
    if last_char != b'\n':
        needToAddNewLine = True

with open(PACK_PRICES_FILE_NAME, mode='a', newline='') as file:
    writer = csv.writer(file)
    if not file_exists:
        header = ['Date'] + list(pack_prices.keys())
        writer.writerow(header)

    if needToAddNewLine:
        file.write('\n')

    row = [current_date] + list(pack_prices.values())
    writer.writerow(row)

print(f"Pack prices updated successfully for {datetime.now(tz).strftime('%Y-%m-%d')}")
exit(0)