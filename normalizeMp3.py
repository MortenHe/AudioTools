#by ChatGPT

import os
import sys
import subprocess

def find_mp3_file(directory, prefix):
    for file in os.listdir(directory):
        if file.lower().startswith(prefix) and file.endswith('.mp3'):
            return os.path.join(directory, file)
    return None

def main():
    if len(sys.argv) != 2:
        print("Usage: script.py <prefix>")
        sys.exit(1)

    prefix = sys.argv[1]
    #directory = r'C:\Users\Martin\Desktop\Nextcloud\Raspi\audio\wap\mp3\extra\misc\heart-mix-laila'
    directory = r'C:\Users\Martin\Desktop\Nextcloud\Raspi\audio\shp\kids\Neu 2024'

    mp3_file = find_mp3_file(directory, prefix)
    
    if mp3_file:
        command = ["mp3gain", "-r", mp3_file]
        try:
            subprocess.run(command, check=True)
            print(f"Successfully processed: {mp3_file}")
        except subprocess.CalledProcessError as e:
            print(f"Error processing {mp3_file}: {e}")
    else:
        print(f"No MP3 file found with prefix: {prefix}")

if __name__ == "__main__":
    main()
