//Rechnungen erstellen aus einzelnen Dateien. "3 + 5 = 8.mp3"
const fs = require("fs-extra");
const execSync = require("child_process").execSync;

//Pfade wo die Dateien lokal liegen
const audioDir = fs.readJSONSync("config.json").audioDir;
const numberDir = audioDir + "/soundquiz/rechnen";

//Fuer welche Operationen sollen Dateien erstellt werden
const calculations = ["plus", "minus"];
const minValue = 0;
const firstValueMax = 20;
const secondValueMax = 10;

for (calculation of calculations) {
  for (let i = minValue; i <= firstValueMax; i++) {
    for (let j = minValue; j <= secondValueMax; j++) {
      switch (calculation) {
        case "plus":
          if (i + j <= firstValueMax) {
            console.log(i + " + " + j + " = " + (i + j));
            createAudioFile(i, j, calculation, i + j);
          }
          break;
        case "minus":
          if (i - j >= minValue) {
            console.log(i + " - " + j + " = " + (i - j));
            createAudioFile(i, j, calculation, i - j);
          }
          break;
      }
    }
  }
}

function createAudioFile(first, second, calculation, result) {
  //Mit Wiederholung des Ergebnisses
  //const concatString = `next.mp3|${first}.mp3|${calculation}.mp3|${second}.mp3|wait.mp3|${result}.mp3|${first}.mp3|${calculation}.mp3|${second}.mp3|gibt.mp3|${result}.mp3`;
  
  //Kurze Version
  const concatString = `next.mp3|${first}.mp3|${calculation}.mp3|${second}.mp3|gibt.mp3|wait-short.mp3|${result}.mp3`;
  const outputName = `file-${first}${calculation}${second}.mp3`;
  const execString =
    "cd " +
    numberDir +
    ' && ffmpeg -hide_banner -loglevel error -y -i "concat:' +
    concatString +
    '" -acodec copy "' +
    outputName +
    '"';
  execSync(execString);
}
