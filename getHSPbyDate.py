#created by chatgpt
import os
import json
from datetime import datetime

# Directory containing the JSON files
directory = r'C:\Users\Martin\Desktop\Nextcloud\Raspi\audio\wap\json\hsp'

# List to hold all the name entries along with their added dates
entries = []

# Traverse through all files in the directory
for filename in os.listdir(directory):
    if filename.endswith('.json'):
        filepath = os.path.join(directory, filename)
        
        # Open and read each JSON file
        with open(filepath, 'r', encoding='utf-8') as file:
            data = json.load(file)
            
            # Extract name and added properties
            for item in data:
                name = item.get('name')
                added = item.get('added')
                
                if name and added:
                    # Append the tuple (name, added) to the entries list
                    entries.append((name, added))

# Sort the entries by the added date in descending order
sorted_entries = sorted(entries, key=lambda x: datetime.strptime(x[1], '%Y-%m-%d'), reverse=True)

# Print the sorted names along with their dates in the format NAME (DD.MM.YYYY)
for name, added in sorted_entries:
    added_date = datetime.strptime(added, '%Y-%m-%d').strftime('%d.%m.%Y')
    print(f"{name} ({added_date})")
