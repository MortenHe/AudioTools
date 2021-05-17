//RFID-Config mit Audiodateien und Bildern (fuer Karten) vergleichen (was fehlt wo?)

//libraries laden fuer Dateizugriff
const fs = require('fs-extra')
const path = require('path');
const glob = require('glob');

//Pfade wo die Dateien liegen auf Server
const audioDir = fs.readJsonSync("config.json").audioDir;
const soundquizDir = audioDir + "/soundquiz";
const cardsDir = audioDir + "/../../cards";

//RFID-Config einlesen
const rfidFile = fs.readJSONSync(soundquizDir + "/soundquiz_rfid.json");

//welche Lernspiele gibt es (Rechnen nicht pruefen)
const games = ["people", "sounds"];

//RFID-Daten anhnad der Spiele merken
rfidData = {};
for (game of games) {
    rfidData[game] = new Set();
}

//Ueber RFID Infos gehen
for (key in rfidFile) {
    const obj = rfidFile[key];

    //Wenn es eine Spielkarte ist, den Wert im passenden Bereich sammeln
    if (obj.games) {
        for (game of obj.games) {

            //Rechnen nicht pruefen
            if (game !== "numbers") {
                rfidData[game].add(obj.value);

                //Karten ausgeben, die zwar erfasst sind, aber inaktiv sind oder noch kein korrekte RFID haben
                if (!obj.active || key.startsWith("todo")) {
                    console.log("no rfid / inactive card: " + key + " = " + obj.value);
                }
            }
        }
    }
}

//Ueber Spielarten gehen
for (game of games) {

    //Ermitteln welche Fragen-Dateien es gibt
    const questions = new Set(glob.sync(soundquizDir + "/" + game + "/*-question.mp3").map(file => {
        return path.basename(file, '.mp3').replace('-question', '');
    }));

    //Ermitteln welche Loesungs-Dateien es gibt
    const names = new Set(glob.sync(soundquizDir + "/" + game + "/*-name.mp3").map(file => {
        return path.basename(file, '.mp3').replace('-name', '');
    }));

    //Ermitteln welche Bilder es gibt
    const pics = new Set(glob.sync(cardsDir + "/soundquiz/" + game + "/*.jpg").map(file => {
        return path.basename(file, '.jpg');
    }));

    //Union aller Werte
    const allValues = new Set([...questions, ...names, ...pics, ...rfidData[game]]);
    console.log();

    //Welche Fragen-Dateien fehlen?
    const missingQuestions = new Set([...allValues].filter(x => !questions.has(x)));
    if (missingQuestions.size) {
        console.log("Fehlende -question.mp3 bei " + game + ": " + [...missingQuestions].join(', '));
    }

    //Welche Loesungs-Dateien fehlen?
    const missingNames = new Set([...allValues].filter(x => !names.has(x)));
    if (missingNames.size) {
        console.log("Fehlende -name.mp3 bei " + game + ": " + [...missingNames].join(', '));
    }

    //Welche Bilder fehlen?
    const missingPics = new Set([...allValues].filter(x => !pics.has(x)));
    if (missingPics.size) {
        console.log("Fehlende Bilder bei " + game + ": " + [...missingPics].join(', '));
    }

    //Welche RFID-Eintraege fehlen?
    const missingRFID = new Set([...allValues].filter(x => !rfidData[game].has(x)));
    if (missingRFID.size) {
        console.log("Fehlender RFID-Eintrag bei " + game + ": " + [...missingRFID].join(', '));
    }
}