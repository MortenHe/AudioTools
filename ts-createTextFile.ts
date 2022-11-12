//Hoerpslfolgen-Liste erstellen 
//node createTextFile.js bob
import { readdirSync, readFileSync } from 'fs';
import dayjs from 'dayjs'

const configFile = JSON.parse(readFileSync(__dirname + "/config.json", "utf-8"));
const jsonDir = configFile.audioDir + "/wap/json";

//Uebersicht fuer einzelne Serie vs. fuer alle Serien
const hspList: string[] = process.argv[2] ? [process.argv[2]] : getHSPList(jsonDir);

//Initialen Liste erstellen
let updateDay = '0000-00-00';

//Update-Liste erstellen
//updateDay = '2022-06-18';

//Updatedatum fuer Ueberschrift
const updateDayDisplay = (updateDay !== '0000-00-00') ? dayjs(updateDay).format('DD.MM.YYYY') : dayjs().format('DD.MM.YYYY')
console.log("Hörspiel-Liste vom " + updateDayDisplay);

//Ueber einzelne Hoerspiele gehen und Listen erstellen
for (const hsp of hspList) {

    //Daten dieser Serie sammeln und spaeter ausgeben
    const outputData: string[] = [];

    //JSON-Datei laden (janosch.json)
    const filePath = jsonDir + "/hsp/" + hsp + ".json";
    const json: any[] = JSON.parse(readFileSync(filePath, "utf-8"));

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
        const name = obj.name as string;
        //const name_short = (hsp !== "misc") ? name.match(/- .*/)[0] : name;
        let name_short = name;
        if (hsp !== "misc") {
            let temp = name.match(/^.* (\d+ - .*)$/);
            if (temp && temp[1]) {
                name_short = temp[1];
            }
        }
        outputData.push(name_short);
    }

    //Daten dieses HSP sortieren und ausgeben
    //outputData.sort();
    console.log(outputData.join("\n"));
}

//Liste der HSP auslesen
function getHSPList(jsonDir: string) {
    const hspList: string[] = [];

    //Hoerspiellisten sammeln
    const files = readdirSync(jsonDir + "/hsp");
    for (const file of files) {
        hspList.push(file.replace(".json", ""))
    }
    return hspList;
}