// Vorlesedateien erzeugen fuer stt und random Joker

// Libraries laden fuer Dateizugriff
const fs = require("fs-extra");
const glob = require("glob");
const path = require("path");
const execSync = require("child_process").execSync;

// Pfade wo die Dateien lokal liegen
const audioDir = fs.readJSONSync("config.json").audioDir;
const readFilesDir = `${audioDir}/wap/wav`;
const jsonDir = `${audioDir}/wap/json`;

// Audio-Infos aus JSON-Config-Dateien sammeln
const jsonFiles = glob.sync(`${jsonDir}/*/*.json`);

// Process each JSON file
jsonFiles.forEach(jsonFile => {
  const topFolder = path.basename(path.dirname(jsonFile));
  const subFolder = path.basename(jsonFile, ".json");

  // Read and parse JSON data
  const jsonData = fs.readJsonSync(jsonFile);

  // Process each entry in the JSON data
  jsonData.forEach(jsonObj => {
    const filename = `${topFolder}-${subFolder}-${jsonObj.file}.wav`;
    const titleToRead = jsonObj.name.replace(/ \- \d+ \-/, "");
    const lang = jsonObj.lang || "de-DE";

    // Check if the file already exists
    if (!fs.existsSync(`${readFilesDir}/${filename}`)) {
      console.log(`${titleToRead}`);
      //console.log(`create ${filename}`);

      const ttsFile = path.join(__dirname, "tts.wav");
      const ttsEqFile = path.join(__dirname, "tts-eq.wav");
      const outFile = path.join(readFilesDir, filename);

      const toWslPath = (winPath) => {
        const absolute = path.resolve(winPath);
        if (process.platform === "win32") {
          const drive = absolute.charAt(0).toLowerCase();
          const rest = absolute.slice(2).replace(/\\/g, "/");
          return `/mnt/${drive}${rest}`;
        }
        return absolute;
      };

      const shellEscapeDouble = (value) => value.replace(/(["\\`\$])/g, "\\$1");

      const wslTtsFile = toWslPath(ttsFile);
      const wslTtsEqFile = toWslPath(ttsEqFile);
      const wslOutFile = toWslPath(outFile);
      const wslTitle = shellEscapeDouble(titleToRead);

      const pico2waveCmd = `wsl pico2wave -l "${lang}" -w "${wslTtsFile}" "${wslTitle}"`;
      const ffmpegEqCmd = `wsl ffmpeg -i "${wslTtsFile}" -af equalizer=f=300:t=h:width=200:g=-30 "${wslTtsEqFile}" -hide_banner -loglevel error -y`;
      const ffmpegCompressCmd = `wsl ffmpeg -i "${wslTtsEqFile}" -af acompressor=threshold=-11dB:ratio=9:attack=200:release=1000:makeup=8 "${wslOutFile}" -hide_banner -loglevel error -y`;

      execSync(pico2waveCmd);
      execSync(ffmpegEqCmd);
      execSync(ffmpegCompressCmd);
    }
  });
});

// Find all wav files in the directory
const allWavFiles = glob.sync(readFilesDir + "/*.wav").map((filePath) => path.basename(filePath));

// Collect all filenames expected based on JSON files
const expectedWavFiles = [];
for (const jsonFile of jsonFiles) {
  const topFolder = path.basename(path.dirname(jsonFile));
  const subFolder = path.basename(jsonFile, ".json");
  const jsonData = fs.readJsonSync(jsonFile);

  for (const jsonObj of jsonData) {
    const filename = `${topFolder}-${subFolder}-${jsonObj.file}.wav`;
    expectedWavFiles.push(filename);
  }
}

// Find orphaned wav files (those not listed in expectedWavFiles)
const expectedSet = new Set(expectedWavFiles); // Use Set for faster comparison
const orphanedWavFiles = allWavFiles.filter((wavFile) => !expectedSet.has(wavFile));

// Delete orphaned files
for (const orphanedFile of orphanedWavFiles) {
  const fullPath = path.join(readFilesDir, orphanedFile);
  try {
    fs.unlinkSync(fullPath); // Deletes the file
    console.log(`Deleted unused file: ${orphanedFile}`);
  } catch (error) {
    console.error(`Failed to delete file: ${orphanedFile}`, error);
  }
}

//console.log("Cleanup complete. Removed all unused .wav files.");
