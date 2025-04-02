import csv
from datetime import datetime
import requests
import os
import pandas as pd
import plotly.express as px

urlBySet = {}

# populate the urlBySet dictionary from the CSV file
with open('assets/set_info.csv', newline='') as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        set_name = row['Set']
        urlBySet[set_name] = row['ID']

# Create the 'prices' folder if it doesn't exist
if not os.path.exists('prices'):
    os.makedirs('prices')

# Loop through the urlBySet dictionary and fetch data
for set in urlBySet:
    response = requests.get(f"https://tcgcsv.com/tcgplayer/3/{urlBySet[set]}/ProductsAndPrices.csv")
    if response.status_code == 200:
        # Write the response content to a CSV file inside the 'prices' folder
        with open(f'assets/set_prices/{set}.csv', 'w', newline='', encoding='utf-8') as f:
            f.write(response.text)
    else:
        print(f"Failed to retrieve the CSV file for {set}. Status code: {response.status_code}")
        exit(1)
        
print("Expected values updated successfully.")
exit(0)