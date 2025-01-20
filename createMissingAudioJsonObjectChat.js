// Ermitteln für welche Audio-Playlists auf dem lokalen System es noch keinen JSON-Eintrag gibt
// und für welche JSON-Einträge es keinen Ordner auf dem Dateisystem gibt

// Libraries laden
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const mp3Duration = require('mp3-duration'); // Audio-Länge berechnen
const timelite = require('timelite'); // Zeit formatieren

// Pfade aus config.json laden
const audioDir = fs.readJSONSync("config.json").audioDir;
const audioFilesDir = path.join(audioDir, "wap/mp3");
const jsonDir = path.join(audioDir, "wap/json/");

// Ordner-Benennungen für automatische Namensgenerierung
const naming = {
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
    "motu": "He-Man"
};

// Hilfsfunktion: Dauer berechnen und formatieren
async function calculateDuration(folderPath) {
    const files = await fs.readdir(folderPath);
    let totalDuration = 0;

    for (const file of files) {
        if (path.extname(file).toLowerCase() === '.mp3') {
            try {
                const duration = await mp3Duration(path.join(folderPath, file));
                totalDuration += duration;
            } catch (err) {
                console.error(`Error calculating duration for file ${file}:`, err.message);
            }
        }
    }

    // Dauer formatieren (Sekunden -> hh:mm:ss)
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    const seconds = Math.floor(totalDuration % 60);

    return timelite.time.str([hours, minutes, seconds]);
}

// Hilfsfunktion: JSON-Objekt generieren
function createJsonEntry(folder, mode) {
    let name = path.basename(folder)
        .replace(/-/g, ' ')
        .replace(/(\d+ )/, '$1- ')
        .replace(/ - [a-z]/g, (chr) => chr.toUpperCase());

    if (naming[mode]) {
        name = naming[mode] + " - " + name;
    }

    return {
        name: name,
        file: path.basename(folder),
        added: new Date().toISOString().slice(0, 10)
    };
}

// Hauptfunktion
async function processAudioFolders() {
    try {
        // Lokale Audio-Ordner sammeln
        const localFolders = new Set(
            glob.sync(path.join(audioFilesDir, "*/*/*")).map(folder => {
                const topFolder = path.basename(path.dirname(path.dirname(folder)));
                const subFolder = path.basename(path.dirname(folder));
                const fileName = path.basename(folder);
                return `${topFolder}/${subFolder}/${fileName}`;
            })
        );

        // Audio-Einträge aus JSON-Config-Dateien sammeln
        const jsonAudioFiles = new Set(
            glob.sync(path.join(jsonDir, "*/*.json")).flatMap(jsonFile => {
                const topFolder = path.basename(path.dirname(jsonFile));
                const subFolder = path.basename(jsonFile, ".json");
                const jsonData = fs.readJsonSync(jsonFile);
                return jsonData.map(jsonObj => `${topFolder}/${subFolder}/${jsonObj.file}`);
            })
        );

        // Ordner, die in JSON fehlen
        const missingJsonFiles = [...localFolders].filter(folder => !jsonAudioFiles.has(folder));

        // JSON-Einträge, die im Dateisystem fehlen
        const missingAudioFolders = [...jsonAudioFiles].filter(folder => !localFolders.has(folder));

        // Fehlende JSON-Einträge erstellen
        const outputArray = [];
        for (const folder of missingJsonFiles) {
            try {
                const mode = path.basename(path.dirname(folder));
                const jsonEntry = createJsonEntry(folder, mode);
                jsonEntry.length = await calculateDuration(path.join(audioFilesDir, folder));
                outputArray.push(jsonEntry);

                // JSON-Objekt ausgeben
                console.log(",");
                console.log(JSON.stringify(jsonEntry, null, 4));
            } catch (err) {
                console.error(`Error processing folder ${folder}:`, err.message);
            }
        }

        // Fehlende JSON-Einträge ausgeben
        if (outputArray.length > 0) {
            console.log("Missing JSON entries created successfully.");
        } else {
            console.log("No missing JSON entries found.");
        }

        // Fehlende Ordner ausgeben
        if (missingAudioFolders.length > 0) {
            console.log("\nJSON-Einträge ohne passenden Ordner im Dateisystem:");
            console.log(missingAudioFolders.join("\n"));
        } else {
            console.log("\nNo missing folders found.");
        }
    } catch (err) {
        console.error("Error processing audio folders:", err.message);
    }
}

// Funktion starten
processAudioFolders().then(() => {
    console.log("Script execution completed.");
}).catch(err => {
    console.error("Script execution failed:", err);
});
