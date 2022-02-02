//Ermitteln fuer welche Audio-Playlists auf dem lokalen System es noch keinen JSON-Eintrag gibt und die zugehoerigen JSON-Eintraege erstellen und ausgeben
//node .\createMissingAudioJsonObject

//libraries laden fuer Dateizugriff
const fs = require('fs-extra')
const glob = require("glob");
const path = require("path");

//Laenge der Playlist berechnen
const mp3Duration = require('mp3-duration');

//Zeit Formattierung laden: [5, 13, 22] => 05:13:22
const timelite = require('timelite');

//Pfade wo die Dateien lokal liegen 
const audioDir = fs.readJSONSync("config.json").audioDir;
const audioFilesDir = audioDir + "/wap/mp3";
const jsonDir = audioDir + "/wap/json/";

//Benennungen anhand des Ordners, in dem die Dateien liegen
const naming = [];
naming["conni"] = "Conni";
naming["bibi"] = "Bibi Blocksberg";
naming["bibi-tina"] = "Bibi und Tina";
naming["pumuckl"] = "Pumuckl";
naming["bob"] = "Bob der Baumeister";
naming["bebl"] = "Benjamin Blümchen";
naming["wieso"] = "Wieso Weshalb Warum";
naming["erzaehl-mir-was"] = "Erzähl mir was";

//Lokale Audio-Ordner sammeln
const audioFolders = new Set();
const localFolders = glob.sync(audioFilesDir + "/*/*/*");
for (const localFolder of localFolders) {

    //hsp
    const topFolder = path.basename(path.dirname(path.dirname(localFolder)));

    //janosch
    const subFolder = path.basename(path.dirname(localFolder));

    //riesenparty
    const filename = path.basename(localFolder);

    //hsp/janosch/riesenparty
    audioFolders.add(topFolder + "/" + subFolder + "/" + filename)
}

//Audio-Infos aus JSON-Config-Dateien sammeln
const jsonAudioFiles = new Set();
const jsonFiles = glob.sync(jsonDir + "/*/*.json");
for (const jsonFile of jsonFiles) {

    //hsp
    const topFolder = path.basename(path.dirname(jsonFile));

    //bobo
    const subFolder = path.basename(jsonFile, ".json");

    //Ueber Folder in bob.json gehen
    const jsonData = fs.readJsonSync(jsonFile);
    for (const jsonObj of jsonData) {

        //hsp/bobo/tv-01
        jsonAudioFiles.add(topFolder + "/" + subFolder + "/" + jsonObj.file);
    }
}

//Audio-Infos sammeln
const outputArray = [];

//Infos per Promise holen und merken
const durationPromises = [];
const totalDuration = [];

//Ordner ermitteln, die in JSON-Config aber nicht im Dateisystem exisiteren
const missingAudioFolders = [...jsonAudioFiles].filter(audioFolder => !audioFolders.has(audioFolder));
if (missingAudioFolders.length) {
    console.log("Ordner aus Config, die nicht im Dateisystem sind");
    console.log(missingAudioFolders);
}

//Ueber Ordner gehen, fuer die es noch keinen JSON-Eintrag gibt und den JSON-Eintrag erstellen
const missingJsonFiles = [...audioFolders].filter(audioFolder => !jsonAudioFiles.has(audioFolder));
for (missingJsonFile of missingJsonFiles) {

    //Wert wegen async in Variable speichern
    const folder = missingJsonFile;

    //bebl um Praefix "Benjamin Bluemchen" ableiten zu koennen
    const mode = path.basename(path.dirname(folder));

    //hsp/bibi-tina/15-der-rote-hahn -> 15-der-rote-hahn
    let name = path.basename(folder);

    //15-der-rote-hahn -> 15 der rote hahn
    name = name.replace(/-/g, ' ');

    //15 der rote hahn -> 15 - der rote hahn (nur wenn name mit Zahlen beginnt)
    name = name.replace(/(\d+ )/, '$1- ');

    //15 - der rote hahn -> 15 - Der Rote Hahn (Praefix Bibi und Tina + Aenderung Rote -> rote muss haendisch durchgefuehrt werden)
    name = name.replace(/\b[a-z]/g, (chr) => {
        return chr.toUpperCase();
    });

    //Praefix vorne dran, wenn definiert. 15 - Der Rote Hahn -> Bibi und Tina - 15 - Der Rote Hahn
    name = naming[mode] ? naming[mode] + " - " + name : name;

    //hsp/bibi-tina/15-der-rote-hahn -> 15-der-rote-hahn
    const file = path.basename(folder);

    //JSON-Objekt fuer diese Folge erstellen
    outputArray[folder] = {
        "name": name,
        "file": file,
        "added": new Date().toISOString().slice(0, 10)
    };

    //Ueber Dateien des Ordners gehen und Gesamtdauer ermitteln
    fs.readdir(audioFilesDir + "/" + folder, (err, files) => {
        totalDuration[folder] = 0;
        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.mp3') {
                durationPromises.push(new Promise((resolve, reject) => {
                    mp3Duration(audioFilesDir + "/" + folder + "/" + file, (err, duration) => {
                        if (err) {
                            reject(err.message);
                        }

                        //Laenge aufsummieren
                        totalDuration[folder] += duration;
                        resolve();
                    });
                }));
            }
        }

        //warten bis alle Promises abgeschlossen sind
        Promise.all(durationPromises).then(() => {

            //Gesamtzeit als formattierten String. Zunaechst Float zu int: 13.4323 => 13
            let totalSeconds = Math.trunc(totalDuration[folder]);

            //Umrechung der Sekunden in [h, m, s] fuer formattierte Darstellung
            const hours = Math.floor(totalSeconds / 3600);
            totalSeconds %= 3600;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            //h, m, s-Werte in Array packen
            const timeOutput = [hours, minutes, seconds];

            //[2,44,1] => 02:44:01
            const timeOutputString = timelite.time.str(timeOutput);

            //Laenge setzen
            outputArray[folder]["length"] = timeOutputString;

            //JSON-Objekt-Array ausgeben
            console.log(",");
            console.log(JSON.stringify(outputArray[folder], null, 4));
        }).catch((err) => {
            console.log('error:', err);
        });
    });
}