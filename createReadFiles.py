#!/usr/bin/env python3
"""Create read files for stt and random joker."""

import os
import json
import glob
import re
import sys
import subprocess
import platform
from pathlib import Path

def generate_tts_audio(text, lang, output_path):
    """Generate TTS audio using system-appropriate method."""
    system = platform.system()
    
    # Ensure text is properly encoded as UTF-8
    if isinstance(text, bytes):
        text = text.decode('utf-8')
    text = text.encode('utf-8', errors='replace').decode('utf-8')
    
    if system == "Windows":
        # Use pyttsx3 for Windows
        try:
            import pyttsx3
            engine = pyttsx3.init()
            engine.setProperty('rate', 150)
            
            # Map language codes to voice selection
            if 'de' in lang.lower():
                # Try to find German voice
                voices = engine.getProperty('voices')
                for voice in voices:
                    if 'German' in voice.name or 'Deutsch' in voice.name:
                        engine.setProperty('voice', voice.id)
                        break
            
            engine.save_to_file(text, output_path)
            engine.runAndWait()
            engine.stop()
            return True
        except ImportError:
            print("Error: pyttsx3 is not installed. Install it with: pip install pyttsx3")
            return False
    else:
        # Use pico2wave for Linux
        try:
            # Properly escape the text for shell command
            escaped_text = text.replace('"', '\\"').replace("'", "\\'")
            pico2wave_cmd = f'pico2wave -l {lang} -w "{output_path}" "{escaped_text}"'
            subprocess.run(pico2wave_cmd, shell=True, check=True, encoding='utf-8')
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error with pico2wave: {e}")
            return False

# Load configuration
with open("config.json", "r", encoding="utf-8") as f:
    config = json.load(f)

audio_dir = config["audioDir"]
read_files_dir = f"{audio_dir}/wap/wav"
json_dir = f"{audio_dir}/wap/json"

# Create read_files_dir if it doesn't exist
Path(read_files_dir).mkdir(parents=True, exist_ok=True)

# Collect all JSON files
json_files = glob.glob(f"{json_dir}/*/*.json")

# Process each JSON file
for json_file in json_files:
    top_folder = os.path.basename(os.path.dirname(json_file))
    sub_folder = os.path.splitext(os.path.basename(json_file))[0]

    # Read and parse JSON data
    with open(json_file, "r", encoding="utf-8") as f:
        json_data = json.load(f)

    # Process each entry in the JSON data
    for json_obj in json_data:
        filename = f"{top_folder}-{sub_folder}-{json_obj['file']}.wav"
        
        # Remove episode numbers from title
        # Handles: "Title - 14 - Description" or similar patterns
        title_to_read = json_obj["name"]
        # Remove numbers between dashes: " - 14 - " -> " - "
        title_to_read = re.sub(r'\s*-\s*\d+\s*-\s*', ' - ', title_to_read)
        # Remove leading numbers: "14 - Title" -> "Title"
        title_to_read = re.sub(r'^\d+\s*-\s*', '', title_to_read)
        # Remove numbers in parentheses: "(14)" removed
        title_to_read = re.sub(r'\(\d+\)', '', title_to_read)
        # Remove numbers in brackets: "[14]" removed
        title_to_read = re.sub(r'\[\d+\]', '', title_to_read)
        # Collapse multiple spaces into single space
        title_to_read = re.sub(r'\s+', ' ', title_to_read).strip()
        
        lang = json_obj.get("lang", "de-DE")
        wav_path = os.path.join(read_files_dir, filename)

        # Check if the file already exists
        if not os.path.exists(wav_path):
            print(title_to_read)
            
            # Build the TTS command
            current_dir = os.path.dirname(os.path.abspath(__file__))
            tts_wav = os.path.join(current_dir, "tts.wav")
            tts_eq_wav = os.path.join(current_dir, "tts-eq.wav")
            
            # Generate TTS audio
            if generate_tts_audio(title_to_read, lang, tts_wav):
                ffmpeg_eq_cmd = f'ffmpeg -i "{tts_wav}" -af equalizer=f=300:t=h:width=200:g=-30 "{tts_eq_wav}" -hide_banner -loglevel error -y'
                ffmpeg_compress_cmd = f'ffmpeg -i "{tts_eq_wav}" -af acompressor=threshold=-11dB:ratio=9:attack=200:release=1000:makeup=8 "{wav_path}" -hide_banner -loglevel error -y'
                
                try:
                    subprocess.run(ffmpeg_eq_cmd, shell=True, check=True)
                    subprocess.run(ffmpeg_compress_cmd, shell=True, check=True)
                except subprocess.CalledProcessError as e:
                    print(f"Error processing {filename} with ffmpeg: {e}", file=sys.stderr)
            else:
                print(f"Error generating TTS for {filename}", file=sys.stderr)

# Find all wav files in the directory
all_wav_files = [os.path.basename(f) for f in glob.glob(os.path.join(read_files_dir, "*.wav"))]

# Collect all filenames expected based on JSON files
expected_wav_files = []
for json_file in json_files:
    top_folder = os.path.basename(os.path.dirname(json_file))
    sub_folder = os.path.splitext(os.path.basename(json_file))[0]
    
    with open(json_file, "r", encoding="utf-8") as f:
        json_data = json.load(f)

    for json_obj in json_data:
        filename = f"{top_folder}-{sub_folder}-{json_obj['file']}.wav"
        expected_wav_files.append(filename)

# Find orphaned wav files
expected_set = set(expected_wav_files)
orphaned_wav_files = [f for f in all_wav_files if f not in expected_set]

# Delete orphaned files
for orphaned_file in orphaned_wav_files:
    full_path = os.path.join(read_files_dir, orphaned_file)
    try:
        os.remove(full_path)
        print(f"Deleted unused file: {orphaned_file}")
    except OSError as e:
        print(f"Failed to delete file: {orphaned_file} - {e}", file=sys.stderr)
