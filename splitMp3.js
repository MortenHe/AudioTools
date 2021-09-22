//Ubuntu / Linux WSL: sudo apt install mp3splt
//https://wiki.librivox.org/index.php/How_To_Split_With_Mp3Splt
//http://manpages.ubuntu.com/manpages/hirsute/en/man1/mp3splt.1.html
//mp3splt muss im PATH vorhanden sein

//Datei "32 - Die Verkehrsschule.mp3" (nicht .MP3)
//Datei "26 - Als Bademeister.mp3"

//Libs
const glob = require("glob");
const path = require("path");
const fs = require("fs-extra");
const execSync = require('child_process').execSync;

//Wo liegt die Datei fuer den Split
const splitDir = fs.readJsonSync("config.json").mediaDir + "/split";

//SPLITDIR/15 - Der rote Hahn.mp3
const file = glob.sync(splitDir + "/*.mp3")[0];

//15 - Der rote Hahn
const filename = path.basename(file, ".mp3");

//15 - Der rote Hahn -> 15 - der rote hahn
let newFilename = filename.toLowerCase();

//15 - der rote hahn -> 15-der rote hahn
newFilename = newFilename.replace(/ - /g, '-');

//15-der rote hahn -> 15-der-rote-hahn
newFilename = newFilename.replace(/ /g, '-');

//Umlaute aendern
newFilename = newFilename.replace(/ä/g, 'ae');
newFilename = newFilename.replace(/ö/g, 'oe');
newFilename = newFilename.replace(/ü/g, 'ue');
newFilename = newFilename.replace(/ß/g, 'ss');

//Ordner SPLITDIR/15-der-rote-hahn entfernen (falls z.B. vorher schon splits mit anderer Traecklaenge erzeugt wurden)
fs.removeSync(splitDir + "/" + newFilename);

//15-der-rote-hahn.mp3 anlegen, damit CLI-Skript Datei lesen kann
const newFile = newFilename + ".mp3";
const newFilePath = splitDir + "/" + newFile;
fs.copySync(file, newFilePath);

//Label fuer nummerierte Benennung: 15 - Der rote Hahn -> Der rote Hahn
const label = filename.replace(/\d{2,3} - /, '');

//mp3 mit verschiedenen Thresholds splitten und Ergebnis in eigenen Unterordner speichern
const thresholds = [30, 25, 20, 15, 10];
for (threshold of thresholds) {
    const command = "cd " + splitDir + " && mp3splt -s -p th=-" + threshold + ",nt=6,min=3,trackjoin=120 -d " + threshold + "-" + newFilename + " " + newFile;
    execSync(command, { stdio: 'inherit' });

    //Dateien in Unterordner mit Nummerierung umbenennen
    counter = 1;
    const thresholdDir = splitDir + "/" + threshold + "-" + newFilename;
    const mp3Files = fs.readdirSync(thresholdDir);
    for (const oldFilename of mp3Files) {

        //01 - Der rote Hahn [1].mp3
        const numberedFilename = "0" + counter + " - " + label + " [" + counter + "].mp3";

        //20-15-der-rote-hahn/15-der-rote-hahn/15-der-rote-hahn_00m_00s__07m_00s.mp3 -> 20-15-der-rote-hahn/01 - Der rote Hahn [1].mp3
        const oldFilePath = thresholdDir + "/" + oldFilename;
        const newFilePath = thresholdDir + "/" + numberedFilename;
        fs.renameSync(oldFilePath, newFilePath);
        counter++;
    }
}

//Fuer Splitskript umbenannte Datei 15-der-rote-hahn.mp3 loeschen
fs.removeSync(newFilePath);