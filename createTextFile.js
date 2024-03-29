//Hoerpslfolgen-Liste erstellen 
//node createTextFile.js bob

//Libs & Configs
const dayjs = require('dayjs')
const fs = require('fs-extra');
const configFile = fs.readJsonSync(__dirname + "/config.json");
const jsonDir = configFile.audioDir + "/wap/json";
let hspList;
if (process.argv[2]) {
    hspList = [process.argv[2]];
}
else {
    hspList = getHSPList(jsonDir);
}

//Initialen Liste erstellen
const updateDay = '0000-00-00';

//Update-Liste erstellen
//const updateDay = '2020-11-18';

//Updatedatum fuer Ueberschrift
if (updateDay !== '0000-00-00') {
    updateDayDisplay = dayjs(updateDay).format('DD.MM.YYYY');
}

//bei initialer Liste heutiges Datum fuer Ueberschrift
else {
    updateDayDisplay = dayjs().format('DD.MM.YYYY');
}

//Ueberschrift oben
console.log("Hörspiel-Liste vom " + updateDayDisplay);

//Ueber einzelne Hoerspiele gehen und Listen erstellen
for (const hsp of hspList) {

    //Daten dieser Serie sammeln und spaeter ausgeben
    const outputData = [];

    //JSON-Datei laden (janosch.json)
    const filePath = jsonDir + "/hsp/" + hsp + ".json";
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
        //const name_short = (hsp !== "misc") ? name.match(/- .*/)[0] : name;
        const name_short = (hsp !== "misc") ? name.match(/^.* (\d+ - .*)$/)[1] : name;
        outputData.push(name_short);
    }

    //Daten dieses HSP sortieren und ausgeben
    //outputData.sort();
    console.log(outputData.join("\n"));
}

//Liste der HSP auslesen
function getHSPList(jsonDir) {
    const hspList = [];

    //Hoerspiellisten sammeln
    files = fs.readdirSync(jsonDir + "/hsp");
    for (const file of files) {
        hspList.push(file.replace(".json", ""))
    }
    return hspList;
}