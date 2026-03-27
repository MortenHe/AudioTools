# Hoerpslfolgen-Liste erstellen
# python createTextFile.py bob

import json
import os
import sys
import re
from datetime import datetime
from pathlib import Path

# Load config
with open("config.json", "r") as f:
    config = json.load(f)

json_dir = os.path.join(config["audioDir"], "wap", "json")

# Get HSP list from command-line argument or by reading files
if len(sys.argv) > 1:
    hsp_list = [sys.argv[1]]
else:
    hsp_list = get_hsp_list(json_dir)

# Initial list creation
update_day = '0000-00-00'

# Update list creation
# update_day = '2020-11-18'

# Format date for heading
if update_day != '0000-00-00':
    update_day_display = datetime.strptime(update_day, '%Y-%m-%d').strftime('%d.%m.%Y')
else:
    update_day_display = datetime.now().strftime('%d.%m.%Y')

# Print heading
print(f"Hörspiel-Liste vom {update_day_display}")

# Process each HSP series
for hsp in hsp_list:
    # Collect data for this series
    output_data = []

    # Load JSON file for this series
    file_path = os.path.join(json_dir, "hsp", hsp + ".json")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            json_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        continue

    # Skip empty series
    if not json_data or len(json_data) == 0:
        continue

    # Extract series name: "Bob der Baumeister - 01 - Bobs Welt" => "Bob der Baumeister"
    first_name = json_data[0]["name"]
    if hsp != "misc":
        match = re.match(r'^[^-]+', first_name)
        header = match.group(0).strip() if match else "Unknown"
    else:
        header = "Sonstige"

    print(f"\n{header}")
    print()

    # Collect output data
    for obj in json_data:
        # Filter by update date if applicable
        if (not obj.get("added") and update_day != '0000-00-00') or (obj.get("added", '9999-99-99') < update_day):
            continue

        # Extract short name
        name = obj["name"]
        if hsp != "misc":
            # "Bob der Baumeister - 32 - Der Spielplatz" => "- 32 - Der Spielplatz"
            match = re.search(r'-\s*(\d+\s*-\s*.*)$', name)
            name_short = match.group(0).strip() if match else name
        else:
            name_short = name

        output_data.append(name_short)

    # Sort data by episode number
    def sort_key(entry):
        # Extract leading numbers for natural sorting
        match = re.search(r'\d+', entry)
        num = int(match.group(0)) if match else 0
        
        # Return tuple: (has_number, number, string) for proper sorting
        return (num > 0, num, entry)

    output_data.sort(key=sort_key)

    # Print output
    print("\n".join(output_data))

# List all HSP files
def get_hsp_list(json_dir):
    hsp_list = []
    
    # Collect HSP lists
    hsp_dir = os.path.join(json_dir, "hsp")
    if os.path.exists(hsp_dir):
        for file in os.listdir(hsp_dir):
            if file.endswith(".json"):
                hsp_list.append(file.replace(".json", ""))
    
    return hsp_list
