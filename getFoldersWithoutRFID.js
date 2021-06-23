//Ordner ermitteln, die noch keine RFID gesetzt haben
const fs = require('fs-extra');
const glob = require("glob");

//Ordner ohne RFID sammeln
foldersWithoutRFID = [];

//JSON Assets durchgehen
const jsonDir = fs.readJsonSync("config.json").audioDir + "/wap/json";
const files = glob.sync(jsonDir + "/*/*.json");
for (const file of files) {

    //Ueber Eintraege eines Modes gehen und Eintraege ohne RFID sammeln, Eintraege die keine RFID erhalten sollen haben in der JSON-Datei rfid=null
    const json = fs.readJSONSync(file);
    for (album of json) {
        if (!album.rfid && album.rfid !== null) {
            foldersWithoutRFID.push(album.name);
        }
    }
}

//Trefferliste sortieren und ausgeben
foldersWithoutRFID.sort();
console.log(foldersWithoutRFID.length + " folders without rfid");
console.log(foldersWithoutRFID);