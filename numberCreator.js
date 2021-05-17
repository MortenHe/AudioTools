//Rechenaufgaben fuer Lernspiel "numbers" erstellen

//libraries laden fuer Dateizugriff
const execSync = require('child_process').execSync;
const fs = require('fs-extra');

//Wo liegen die Dateien zur Erzeugung der Rechenabfragen
const soundquizDir = fs.readJsonSync("config.json").audioDir + "/soundquiz";

//Audiofiles von Rechnungen erstellen
for (let i = 1; i <= 9; i++) {
    for (let j = 1; j <= 10; j++) {
        const questionName = i + "+" + j;
        const sum = i + j;
        if (sum <= 10) {
            const outputName = soundquizDir + "/numbers/" + questionName + "-question.mp3";
            execSync('cd ' + soundquizDir + "/rawnumbers" + ' && ffmpeg -y -i "concat:' + i + '.mp3|plus.mp3|' + j + '.mp3" -acodec copy "' + outputName + '"');
            fs.copySync(soundquizDir + "/rawnumbers/" + sum + ".mp3", soundquizDir + "/numbers/" + questionName + "-name.mp3");
        }
    }
}