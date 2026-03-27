//Ubuntu / Linux WSL: sudo apt install mp3splt
//https://wiki.librivox.org/index.php/How_To_Split_With_Mp3Splt
//http://manpages.ubuntu.com/manpages/hirsute/en/man1/mp3splt.1.html
//mp3splt muss im PATH vorhanden sein

//Datei mit mp3DirectCut trimmen und normalisieren
//Datei "32 - Die Verkehrsschule.mp3" (nicht .MP3)
//Datei "26 - Als Bademeister.mp3"

//Libs
const glob = require("glob");
const path = require("path");
const fs = require("fs-extra");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

//Wo liegt die Datei fuer den Split
const splitDir = fs.readJsonSync("config.json").mediaDir + "/split";

async function processFile(file) {
  //15 - Der rote Hahn
  const filename = path.basename(file, ".mp3");

  //15 - Der rote Hahn -> 15 - der rote hahn
  let newFilename = filename.toLowerCase();

  //15 - der rote hahn -> 15-der rote hahn
  newFilename = newFilename.replace(/ - /g, "-");

  //15-der rote hahn -> 15-der-rote-hahn
  newFilename = newFilename.replace(/ /g, "-");

  //Umlaute aendern
  newFilename = newFilename.replace(/ä/g, "ae");
  newFilename = newFilename.replace(/ö/g, "oe");
  newFilename = newFilename.replace(/ü/g, "ue");
  newFilename = newFilename.replace(/ß/g, "ss");

  //Ordner SPLITDIR/15-der-rote-hahn entfernen (falls z.B. vorher schon splits mit anderer Traecklaenge erzeugt wurden)
  await fs.remove(splitDir + "/" + newFilename);

  //15-der-rote-hahn.mp3 anlegen, damit CLI-Skript Datei lesen kann
  const newFile = newFilename + ".mp3";
  const newFilePath = splitDir + "/" + newFile;
  await fs.copy(file, newFilePath);

  //Label fuer nummerierte Benennung: 15 - Der rote Hahn -> Der rote Hahn
  const label = filename.replace(/\d{2,3} - /, "");

  //mp3 mit time- + autosplit-Methode trennen und in Unterordner speichern
  const outputDir = splitDir + "/" + newFilename;
  await fs.remove(outputDir);
  //-t Tracklaenge 5 min, kein Track kuerzer als 2 min
  //-f Frame-Methode -> genauer
  //-a Autosplit bei Stille
  //-d Ausgabeordner
  const command = `mp3splt -t "5.00>2.00" -f -a -d "${outputDir}" "${newFile}"`;
  await execPromise(command, { cwd: splitDir, stdio: "inherit" });

  //Dateien in Unterordner mit Nummerierung umbenennen
  let counter = 1;
  const timeMp3Files = await fs.readdir(outputDir);
  for (const oldFilename of timeMp3Files) {
    //01 - Der rote Hahn [1].mp3
    const prefix = counter < 10 ? "0" : "";
    const numberedFilename =
      prefix + counter + " - " + label + " [" + counter + "].mp3";

    //der-rote-hahn/15-der-rote-hahn_00m_00s__07m_00s.mp3 -> der-rote-hahn/01 - Der rote Hahn [1].mp3
    const oldFilePath = outputDir + "/" + oldFilename;
    const newFilePath = outputDir + "/" + numberedFilename;
    await fs.rename(oldFilePath, newFilePath);
    counter++;
  }

  //Fuer Splitskript umbenannte Datei 15-der-rote-hahn.mp3 loeschen
  await fs.remove(newFilePath);
}

async function main() {
  //Ueber mp3 in Split-Ordner gehen
  //SPLITDIR/15 - Der rote Hahn.mp3
  //SPLITDIR/17 - Das Herbstturnier.mp3
  const files = glob.sync(splitDir + "/*.mp3");
  for (const file of files) {
    await processFile(file);
  }
}

main().catch(console.error);
