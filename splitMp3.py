# Ubuntu / Linux WSL: sudo apt install mp3splt
# https://wiki.librivox.org/index.php/How_To_Split_With_Mp3Splt
# http://manpages.ubuntu.com/manpages/hirsute/en/man1/mp3splt.1.html
# mp3splt muss im PATH vorhanden sein

# Datei mit mp3DirectCut trimmen und normalisieren
# Datei "32 - Die Verkehrsschule.mp3" (nicht .MP3)
# Datei "26 - Als Bademeister.mp3"

import glob
import os
import shutil
import subprocess
import json
import re
import time

# Wo liegt die Datei fuer den Split
with open("config.json", "r") as f:
    config = json.load(f)
split_dir = os.path.join(config["mediaDir"], "split")

def process_file(file_path):
    # 15 - Der rote Hahn
    filename = os.path.splitext(os.path.basename(file_path))[0]

    # 15 - Der rote Hahn -> 15 - der rote hahn
    new_filename = filename.lower()

    # 15 - der rote hahn -> 15-der rote hahn
    new_filename = new_filename.replace(" - ", "-")

    # 15-der rote hahn -> 15-der-rote-hahn
    new_filename = new_filename.replace(" ", "-")

    # Umlaute aendern
    umlaut_map = str.maketrans({
        'ä': 'ae',
        'ö': 'oe',
        'ü': 'ue',
        'ß': 'ss'
    })
    new_filename = new_filename.translate(umlaut_map)

    # Ordner SPLITDIR/15-der-rote-hahn entfernen (falls z.B. vorher schon splits mit anderer Traecklaenge erzeugt wurden)
    output_dir = os.path.join(split_dir, new_filename)
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)

    # Label fuer nummerierte Benennung: 15 - Der rote Hahn -> Der rote Hahn
    parts = filename.split(" - ", 1)
    if len(parts) == 2:
        label = parts[1]
    else:
        # For normalized files like 08-schlossgespenster, remove number- and capitalize
        label = re.sub(r'^\d{2,3}-', '', filename).capitalize()

    # mp3 mit time- + autosplit-Methode trennen und in Unterordner speichern
    os.makedirs(output_dir, exist_ok=True)
    # -t Tracklaenge 5 min, kein Track kuerzer als 2 min
    # -f Frame-Methode -> genauer
    # -a Autosplit bei Stille
    # -d Ausgabeordner
    command = [
        "mp3splt",
        "-t", "5.00>2.00",
        "-f",
        "-a",
        "-d", output_dir,
        os.path.basename(file_path)
    ]
    subprocess.run(command, cwd=split_dir, check=True)

    # Dateien in Unterordner mit Nummerierung umbenennen
    counter = 1
    for old_filename in sorted(os.listdir(output_dir)):
        if not old_filename.endswith('.mp3'):
            continue
        # 01 - Der rote Hahn [1].mp3
        prefix = "0" if counter < 10 else ""
        numbered_filename = f"{prefix}{counter} - {label} [{counter}].mp3"

        # der-rote-hahn/15-der-rote-hahn_00m_00s__07m_00s.mp3 -> der-rote-hahn/01 - Der rote Hahn [1].mp3
        old_file_path = os.path.join(output_dir, old_filename)
        new_file_path = os.path.join(output_dir, numbered_filename)
        os.rename(old_file_path, new_file_path)
        counter += 1

def main():
    # Ueber mp3 in Split-Ordner gehen
    # SPLITDIR/15 - Der rote Hahn.mp3
    # SPLITDIR/17 - Das Herbstturnier.mp3
    files = glob.glob(os.path.join(split_dir, "*.mp3"))
    for file_path in files:
        process_file(file_path)

if __name__ == "__main__":
    main()