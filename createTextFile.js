//Hoerpslfolgen-Liste erstellen 
//node createTextFile.js bob

//Libs & Configs
const dayjs = require('dayjs');
const fs = require('fs-extra');
const path = require('path');
const configFile = fs.readJsonSync(path.join(__dirname, "config.json"));
const jsonDir = path.join(configFile.audioDir, "wap", "json");

const hspList = process.argv[2] ? [process.argv[2]] : getHSPList(jsonDir);

//Initialen Liste erstellen
const updateDay = '0000-00-00';

//Update-Liste erstellen
//const updateDay = '2020-11-18';

//Updatedatum fuer Ueberschrift
const updateDayDisplay = (updateDay !== '0000-00-00')
    ? dayjs(updateDay).format('DD.MM.YYYY')
    : dayjs().format('DD.MM.YYYY');

//Ueberschrift oben
console.log("Hörspiel-Liste vom " + updateDayDisplay);

//Ueber einzelne Hoerspiele gehen und Listen erstellen
for (const hsp of hspList) {

    //Daten dieser Serie sammeln und spaeter ausgeben
    const outputData = [];

    //JSON-Datei laden (janosch.json)
    const filePath = path.join(jsonDir, "hsp", hsp + ".json");
    const json = fs.readJSONSync(filePath);

    //Leere Serien (Bibi) uebergehen
    if (!json[0]) {
        continue;
    }

    //Name der Hoerspielserie ausgeben: "Bob der Baumeister - 01 - Bobs Welt" => "Bob der Baumeister " (trim entfernt letztes whitespace)
    const header = (hsp !== "misc") ? (json[0].name).match(/^[^-]+/)[0].trim() : "Sonstige";
    console.log("\n" + header);
    console.log();

    //Ausgabedaten sammeln
    for (const obj of json) {
        if ((!obj.added && updateDay !== '0000-00-00') || obj.added < updateDay) {
            continue;
        }

        //"Wieso Weshalb Warum - Feuerwehr & Polizei" -> "- Feuerwehr & Polizei"
        //"Bob der Baumeister - 32 - Der Spielplatz" -> "- 32 - Der Spielplatz"
        const name = obj.name;
        const name_short = (hsp !== "misc")
            ? (name.match(/-\s*(\d+\s*-\s*.*)$/) || { 0: name })[0].trim()
            : name;

        outputData.push(name_short);
    }

    //Daten dieses HSP sortieren und ausgeben
    outputData.sort((a, b) => {
        // Extract leading numbers for natural sorting
        const numA = parseInt(a.match(/\d+/)?.[0] || 0);
        const numB = parseInt(b.match(/\d+/)?.[0] || 0);

        // If both have numbers, sort numerically
        if (numA && numB) {
            return numA - numB;
        }
        // Otherwise, sort alphabetically
        return a.localeCompare(b);
    });

    console.log(outputData.join("\n"));
}

//Liste der HSP auslesen
function getHSPList(jsonDir) {
    const hspList = [];

    //Hoerspiellisten sammeln
    const files = fs.readdirSync(path.join(jsonDir, "hsp"));
    for (const file of files) {
        hspList.push(file.replace(".json", ""));
    }
    return hspList;
}