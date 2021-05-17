//Ermitteln fuer welche Audio-Playlists auf dem lokalen System es noch keinen JSON-Eintrag gibt und die zugehoerigen JSON-Eintraege erstellen und ausgeben
//node .\createMissingAudioJsonObject showTracks
//shotTracks flag setzen, wenn  Trackinfo erstellt werden soll (z.B. gerippte CD mit Titelnamen)

//libraries laden fuer Dateizugriff
const fs = require('fs-extra')
const glob = require("glob");
const path = require("path");
const mp3Duration = require('mp3-duration');

//Zeit Formattierung laden: [5, 13, 22] => 05:13:22
const timelite = require('timelite');

//Pfade wo die Dateien lokal liegen 
const audioDir = fs.readJSONSync("config.json").audioDir;
const audioFilesDir = audioDir + "/wap/mp3";
const jsonDir = audioDir + "/wap/json/pw";

//Erst ab dem 3. Parameter auswerten ()
const argv = require('minimist')(process.argv.slice(2));
const showTracks = argv["_"].includes("showTracks") || false;

//Benennungen anhand des Ordners, in dem die Dateien liegen
naming = [];
naming["conni"] = "Conni";
naming["bibi"] = "Bibi Blocksberg";
naming["bibi-tina"] = "Bibi und Tina";
naming["pumuckl"] = "Pumuckl";
naming["bob"] = "Bob der Baumeister";
naming["bebl"] = "Benjamin Blümchen";
naming["wieso"] = "Wieso Weshalb Warum";

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
outputArray = [];

//Infos per Promise holen und merken
const trackPromises = [];
tracks = [];
const durationPromises = [];
totalDuration = [];

//Ordner ermitteln, die in JSON-Config aber nicht im Dateisystem exisiteren
missingAudioFolders = [...jsonAudioFiles].filter(audioFolder => !audioFolders.has(audioFolder));
if (missingAudioFolders.length) {
    console.log("Ordner aus Config, die nicht im Dateisystem sind");
    console.log(missingAudioFolders);
}

//Ueber Ordner gehen, fuer die es noch keinen JSON-Eintrag gibt und den JSON-Eintrag erstellen
missingJsonFiles = [...audioFolders].filter(audioFolder => !jsonAudioFiles.has(audioFolder));
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
        "active": true,
        "added": new Date().toISOString().slice(0, 10)
    };

    //Ueber Tracks des Ordners gehen
    fs.readdir(audioFilesDir + "/" + folder, (err, files) => {

        //Tracks sammeln und Gesamtdauer ermitteln
        tracks[folder] = [];
        totalDuration[folder] = 0;

        //Ueber Dateien gehen und mp3 auswerten
        for (let file of files) {
            if (path.extname(file).toLowerCase() === '.mp3') {

                //Wenn Tracknamen ausgewertet werden sollen
                if (showTracks) {

                    //Tracks per Promise sammeln
                    trackPromises.push(new Promise((resolve, reject) => {
                        if (err) {
                            reject(err.message);
                        }

                        //Dateinamen kuerzen und sammeln -> Fuehrende Zahlen entfernen und Endung .mp3 mit Hilfe von Gruppe mit OR ( | )
                        fileNameShort = file.replace(/(^\d\d ?-? ?|.mp3$)/g, '');
                        tracks[folder].push(fileNameShort);
                        resolve();
                    }));
                }

                //Gesamtlaenge ermitteln
                durationPromises.push(new Promise((resolve, reject) => {

                    //mp3 Laenge ermitteln
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
        Promise.all(durationPromises, trackPromises).then(() => {

            //Gesamtzeit als formattierten String. Zunaechst Float zu int: 13.4323 => 13
            let totalSeconds = Math.trunc(totalDuration[folder]);

            //Umrechung der Sekunden in [h, m, s] fuer formattierte Darstellung
            let hours = Math.floor(totalSeconds / 3600);
            totalSeconds %= 3600;
            let minutes = Math.floor(totalSeconds / 60);
            let seconds = totalSeconds % 60;

            //h, m, s-Werte in Array packen
            let timeOutput = [hours, minutes, seconds];

            //[2,44,1] => 02:44:01
            let timeOutputString = timelite.time.str(timeOutput);

            //Laenge setzen
            outputArray[folder]["length"] = timeOutputString;

            //Tracks setzen
            outputArray[folder]["tracks"] = tracks[folder];

            //JSON-Objekt-Array ausgeben
            console.log(",");
            console.log(JSON.stringify(outputArray[folder], null, 4));
        }).catch((err) => {
            console.log('error:', err);
        });
    });
}