//JSON-Info erstellen
//node .\createAudioJsonObject.js --prefix="Bob der Baumeister"

//libraries laden fuer Dateizugriff
const fs = require('fs-extra');
const path = require('path');

//Gesamtdauer der Playlist berechnen
const mp3Duration = require('mp3-duration');

//Zeit Formattierung laden: [5, 13, 22] => 05:13:22
const timelite = require('timelite');

//Wo liegen die Dateien fuer die JSON Infos erzeugt werden sollen?
const createAudioDir = fs.readJsonSync("config.json").mediaDir + "/audio";

//Erst ab dem 3. Parameter auswerten
const argv = require('minimist')(process.argv.slice(2));

//Praefix fuer Playlist z.B. Bob der Baumeister
const prefix = argv["prefix"] || "";

//lokale Items (z.B. Audio-Ordner) sammeln
const outputArray = [];

//Infos per Promise holen und merken
const durationPromises = [];
const totalDuration = [];

//Ueber ueber filter-dirs des aktuellen modes gehen (hsp, kindermusik,...)
fs.readdirSync(createAudioDir).forEach(folder => {

    //Wenn es ein Ordner ist
    const stat = fs.statSync(createAudioDir + "/" + folder);
    if (stat && stat.isDirectory()) {

        //15-der-rote-hahn -> 15 der rote hahn
        let name = folder.replace(/-/g, ' ');

        //15 der rote hahn -> 15 - der rote hahn (nur wenn name mit Zahlen beginnt)
        name = name.replace(/(\d+ )/, '$1- ');

        //15 - der rote hahn -> 15 - Der Rote Hahn (Praefix Bibi und Tina + Aenderung Rote -> rote muss haendisch durchgefuehrt werden)
        name = name.replace(/\b[a-z]/g, (chr) => {
            return chr.toUpperCase();
        });

        //JSON-Objekt fuer diese Folge erstellen
        outputArray[folder] = {
            "name": prefix + " - " + name,
            "file": folder,
            "added": new Date().toISOString().slice(0, 10)
        };

        //Ueber Dateien des Ordners gehen und Gesamtdauer berechnen
        fs.readdir(createAudioDir + "/" + folder, (err, files) => {
            totalDuration[folder] = 0;

            //Ueber Dateien gehen und mp3 auswerten
            for (const file of files) {
                if (path.extname(file).toLowerCase() === '.mp3') {

                    //Gesamtlaenge ermitteln
                    durationPromises.push(new Promise((resolve, reject) => {
                        mp3Duration(createAudioDir + "/" + folder + "/" + file, (err, duration) => {
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
});
console.log("run createReadfiles");