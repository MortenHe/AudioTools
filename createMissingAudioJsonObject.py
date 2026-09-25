#!/usr/bin/env python3
"""
Create missing JSON objects for audio playlists that don't have JSON entries.
Usage: python createMissingAudioJsonObject.py
"""

import json
import argparse
from pathlib import Path
from datetime import date
from concurrent.futures import ThreadPoolExecutor, as_completed
import re


def get_mp3_duration(file_path):
    """Get MP3 file duration in seconds using mutagen, ffprobe, or tinytag."""
    # Try mutagen first (pure Python, most reliable)
    try:
        from mutagen.File import File
        audio = File(str(file_path))
        if audio is not None and hasattr(audio, 'info') and audio.info.length:
            return audio.info.length
    except Exception as e:
        pass
    
    # Fallback to ffprobe (requires ffmpeg installation)
    try:
        import subprocess
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', str(file_path)],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except Exception as e:
        pass
    
    # Fallback to tinytag
    try:
        from tinytag import TinyTag
        tag = TinyTag.get(str(file_path), tags=False)
        if tag and tag.duration:
            return tag.duration
    except Exception as e:
        pass
    
    # If all methods fail, return 0 and print error
    print(f"Warning: Could not determine duration for {file_path}")
    return 0


def format_time(seconds):
    """Convert seconds to HH:MM:SS format."""
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:02d}"


def format_name(folder_name, naming_dict):
    """Format folder name to display name."""
    parts = folder_name.split('-')
    if parts and parts[0].isdigit():
        prefix = parts[0]
        title_parts = parts[1:]
    else:
        prefix = None
        title_parts = parts

    lower_exceptions = {
        "an", "aus", "und", "oder", "aber", "denn", "sondern", "als", "wie",
        "bei", "mit", "von", "vom", "zu", "zum", "zur", "im", "am",
        "ans", "des", "dem", "den", "der", "die", "das", "ein",
        "eine", "einer", "einem", "einen", "für", "ohne", "über",
        "unter", "nach", "vor", "zwischen", "gegen", "bis", "inkl",
        "inklusive", "nur", "noch", "auch"
    }

    def normalize_word(word):
        lower = word.lower()
        lower = lower.replace("ue", "ü")
        lower = lower.replace("ae", "ä")
        lower = lower.replace("oe", "ö")
        lower = lower.replace("Ae", "Ä")
        lower = lower.replace("Oe", "Ö")
        lower = lower.replace("Ue", "Ü")
        return lower

    def format_word(word, is_first=False):
        normalized = normalize_word(word)
        if not is_first and normalized in lower_exceptions:
            return normalized
        return normalized.capitalize()

    formatted_name = " ".join(
        format_word(word, i == 0)
        for i, word in enumerate(title_parts)
        if word
    )

    if prefix:
        formatted_name = f"{prefix} - {formatted_name}"

    # Add prefix if naming convention exists
    if naming_dict and naming_dict.get(folder_name):
        formatted_name = f"{naming_dict[folder_name]} - {formatted_name}"

    return formatted_name


def format_search_name(display_name):
    """Create a punctuation-free search name with the episode number spelled out."""
    display_name = display_name.replace("&", " und ")
    episode_match = re.match(r"^(.*?)\s*-\s*(\d+)\s*-\s*(.+)$", display_name)
    if episode_match:
        display_name = (
            f"{episode_match.group(1)} Folge "
            f"{number_to_german(int(episode_match.group(2)))} "
            f"{episode_match.group(3)}"
        )

    search_name = re.sub(r"[^\w\s]", "", display_name, flags=re.UNICODE)
    return " ".join(search_name.split())


def number_to_german(number):
    """Convert a non-negative integer to its German cardinal word."""
    ones = {
        0: "null", 1: "eins", 2: "zwei", 3: "drei", 4: "vier",
        5: "fünf", 6: "sechs", 7: "sieben", 8: "acht", 9: "neun",
        10: "zehn", 11: "elf", 12: "zwölf", 13: "dreizehn",
        14: "vierzehn", 15: "fünfzehn", 16: "sechzehn", 17: "siebzehn",
        18: "achtzehn", 19: "neunzehn"
    }
    tens = {
        20: "zwanzig", 30: "dreißig", 40: "vierzig", 50: "fünfzig",
        60: "sechzig", 70: "siebzig", 80: "achtzig", 90: "neunzig"
    }

    if number < 20:
        return ones[number]
    if number < 100:
        remainder = number % 10
        if remainder == 0:
            return tens[number]
        one = "ein" if remainder == 1 else ones[remainder]
        return f"{one}und{tens[number - remainder]}"
    if number < 1000:
        hundreds, remainder = divmod(number, 100)
        prefix = "einhundert" if hundreds == 1 else f"{ones[hundreds]}hundert"
        return prefix if remainder == 0 else prefix + number_to_german(remainder)
    if number < 1_000_000:
        thousands, remainder = divmod(number, 1000)
        prefix = "eintausend" if thousands == 1 else f"{number_to_german(thousands)}tausend"
        return prefix if remainder == 0 else prefix + number_to_german(remainder)
    raise ValueError("Episode number must be less than 1,000,000")


def update_existing_search_fields(json_dir):
    """Add or refresh search fields in existing JSON files without scanning audio."""
    updated_files = 0
    updated_objects = 0

    for json_file in json_dir.glob("*/*.json"):
        with open(json_file, 'r', encoding='utf-8') as f:
            json_data = json.load(f)

        file_changed = False
        for json_obj in json_data if isinstance(json_data, list) else []:
            if not isinstance(json_obj, dict) or "name" not in json_obj:
                continue

            search_name = format_search_name(json_obj["name"])
            if json_obj.get("search") != search_name:
                json_obj["search"] = search_name
                file_changed = True
                updated_objects += 1

        if file_changed:
            temporary_file = json_file.with_suffix(".json.tmp")
            with open(temporary_file, 'w', encoding='utf-8', newline='\n') as f:
                json.dump(json_data, f, indent=2, ensure_ascii=False)
                f.write('\n')
            temporary_file.replace(json_file)
            updated_files += 1

    print(f"Updated {updated_objects} objects in {updated_files} JSON files.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--update-search",
        action="store_true",
        help="Add or refresh search fields in existing JSON files."
    )
    args = parser.parse_args()

    # Load configuration
    config_path = Path(__file__).parent / "config.json"
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    audio_dir = Path(config["audioDir"])
    audio_files_dir = audio_dir / "wap" / "mp3"
    json_dir = audio_dir / "wap" / "json"

    if args.update_search:
        update_existing_search_fields(json_dir)
        return
    
    # Naming conventions
    naming = {
        "conni": "Conni",
        "barbie": "Barbie",
        "bibi": "Bibi Blocksberg",
        "bibi-tina": "Bibi und Tina",
        "pumuckl": "Pumuckl",
        "bob": "Bob der Baumeister",
        "bebl": "Benjamin Blümchen",
        "wieso": "Wieso Weshalb Warum",
        "erzaehl-mir-was": "Erzähl mir was - Folge - und andere Geschichten",
        "dinosaurs": "Team Dino",
        "albert-e": "Albert E. erklärt",
        "checker-tobi": "Checker Tobi",
        "anna-und-die-wilden-tiere": "Anna und die wilden Tiere",
        "elea": "Elea Eluanda",
        "regreg": "Regina Regenbogen",
        "eldrador": "Eldrador",
        "motu": "He-Man",
    }
    
    # Gather audio folders from filesystem
    audio_folders = set()
    if audio_files_dir.exists():
        for folder in audio_files_dir.glob("*/*/*"):
            if folder.is_dir():
                top_folder = folder.parent.parent.name
                sub_folder = folder.parent.name
                filename = folder.name
                audio_folders.add(f"{top_folder}/{sub_folder}/{filename}")
    
    # Gather audio files from JSON config
    json_audio_files = set()
    if json_dir.exists():
        for json_file in json_dir.glob("*/*.json"):
            top_folder = json_file.parent.name
            sub_folder = json_file.stem
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    json_data = json.load(f)
                    if isinstance(json_data, list):
                        for json_obj in json_data:
                            if "file" in json_obj:
                                json_audio_files.add(f"{top_folder}/{sub_folder}/{json_obj['file']}")
            except Exception as e:
                print(f"Error reading {json_file}: {e}")
    
    # Check for folders in JSON but not in filesystem
    missing_audio_folders = json_audio_files - audio_folders
    if missing_audio_folders:
        print("Folders in config but not in filesystem:")
        for folder in sorted(missing_audio_folders):
            print(f"  {folder}")
    
    # Process missing JSON entries
    output_array = []
    missing_json_files = audio_folders - json_audio_files
    
    # Process each missing audio folder
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {}
        
        for missing_json_file in missing_json_files:
            folder_path = missing_json_file
            mode = folder_path.split("/")[1]  # Get the middle part (e.g., "bibi-tina")
            file_name = folder_path.split("/")[2]  # Get the file name
            
            # Format the display name
            display_name = format_name(file_name, naming)
            if naming.get(mode):
                display_name = f"{naming[mode]} - {display_name}"
            
            # Create output object
            output_obj = {
                "name": display_name,
                "search": format_search_name(display_name),
                "file": file_name,
                "added": date.today().isoformat()
            }
            
            # Submit duration calculation task
            full_folder_path = audio_files_dir / folder_path
            future = executor.submit(calculate_folder_duration, full_folder_path)
            futures[future] = (output_obj, folder_path)
        
        # Collect results as they complete
        for future in as_completed(futures):
            output_obj, folder_path = futures[future]
            try:
                duration = future.result()
                if duration > 0:
                    output_obj["length"] = format_time(duration)
                else:
                    output_obj["length"] = "00:00:00"
            except Exception as e:
                print(f"Error calculating duration for {folder_path}: {e}")
                output_obj["length"] = "00:00:00"
            
            output_array.append(output_obj)
    
    # Sort output by display name to ensure consistent ordering
    output_array.sort(key=lambda obj: obj.get("name", ""))

    # Output results
    if output_array:
        print("Missing JSON objects created:")
        print()
        for obj in output_array:
            print(",")
            print(json.dumps(obj, indent=4, ensure_ascii=False))
    else:
        print("No missing JSON objects found.")
    
    print("\nrun createReadFiles")


def calculate_folder_duration(folder_path):
    """Calculate total duration of all MP3 files in a folder."""
    total_duration = 0
    
    if not folder_path.exists():
        return 0
    
    mp3_files = list(folder_path.glob("*.mp3"))
    if not mp3_files:
        return 0
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(get_mp3_duration, mp3_file) for mp3_file in mp3_files]
        for future in as_completed(futures):
            try:
                total_duration += future.result()
            except Exception as e:
                print(f"Error processing MP3: {e}")
    
    return total_duration


if __name__ == "__main__":
    main()
