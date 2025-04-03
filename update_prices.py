import subprocess

result = subprocess.run(["python3", "update_price_data.py"])

if result.returncode == 0:
    pack_prices_result = subprocess.run(["python3", "update_pack_prices.py"])
    expected_values_result = subprocess.run(["python3", "update_expected_values.py"])
        
else:
    print("Failed to run update_price_data.py")
    print(result.stderr)
    exit(1)