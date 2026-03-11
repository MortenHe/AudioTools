#!/usr/bin/env python3
"""
Create missing JSON objects for audio playlists that don't have JSON entries.
Usage: python createMissingAudioJsonObject.py
"""

import json
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
    # 15-der-rote-hahn -> 15 der rote hahn
    name = folder_name.replace('-', ' ')
    
    # 15 der rote hahn -> 15 - der rote hahn (only if starts with digits)
    name = re.sub(r'^(\d+ )', r'\1- ', name)
    
    # 15 - der rote hahn -> 15 - Der Rote Hahn (capitalize after dash)
    def capitalize_after_dash(match):
        return match.group(0).upper()
    
    name = re.sub(r' - [a-z]', capitalize_after_dash, name)
    
    # Add prefix if naming convention exists
    if naming_dict and naming_dict.get(folder_name):
        name = f"{naming_dict[folder_name]} - {name}"
    
    return name


def main():
    # Load configuration
    config_path = Path(__file__).parent / "config.json"
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    audio_dir = Path(config["audioDir"])
    audio_files_dir = audio_dir / "wap" / "mp3"
    json_dir = audio_dir / "wap" / "json"
    
    # Naming conventions
    naming = {
        "conni": "Conni",
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
