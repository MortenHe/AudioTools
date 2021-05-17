//Hoerpslfolgen-Liste erstellen 
//node createTextFile.js bob

//Libs & Configs
const fs = require('fs-extra');
const configFile = fs.readJsonSync(__dirname + "/config.json");
const jsonDir = configFile.audioDir + "/wap/json/pw";
const hsp = process.argv[2] || "wieso";

//JSON-Datei laden (janosch.json)
const filePath = jsonDir + "/hsp/" + hsp + ".json";
const json = fs.readJSONSync(filePath);

//Name der Hoerspielserie ausgeben: "Bob der Baumeister - 00 - Bob Joker" => "Bob der Baumeister " (trim entfernt letztes whitespace)
const header = (json[0].name).match(/^[^-]+/);
console.log(header[0].trim());
console.log();
for (let obj of json) {
    const name = obj.name

    //"Wieso Weshalb Warum - Feuerwehr & Polizei" -> "- Feuerwehr & Polizei"
    //"Bob der Baumeister - 32 - Der Spielplatz" -> "- 32 - Der Spielplatz"
    const name_short = name.match(/- .*/)
    console.log(name_short[0])
}