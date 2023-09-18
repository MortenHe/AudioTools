//Ubuntu / Linux WSL: sudo apt install mp3splt
//https://wiki.librivox.org/index.php/How_To_Split_With_Mp3Splt
//http://manpages.ubuntu.com/manpages/hirsute/en/man1/mp3splt.1.html
//mp3splt muss im PATH vorhanden sein

//Datei mit mp3DirectCut trimmen und normalisieren
//Datei "32 - Die Verkehrsschule.mp3" (nicht .MP3)
//Datei "26 - Als Bademeister.mp3"

import { glob } from "glob";
import path from "node:path";
import { execSync } from "node:child_process";
import { cpSync, readdirSync, renameSync, rmSync } from "node:fs";
import config from "./config.json";

const splitDir = config.mediaDir + "/split";

//Ueber mp3s in Split-Ordner gehen
//SPLITDIR/15 - Der rote Hahn.mp3
//SPLITDIR/17 - Das Herbstturnier.mp3
const files = glob.sync(splitDir + "/*.mp3");
for (const file of files) {
  //15 - Der rote Hahn
  const filename = path.basename(file, ".mp3");

  //15 - Der rote Hahn -> 15 - der rote hahn
  const newFilename = filename.toLowerCase()
    //15 - der rote hahn -> 15-der rote hahn
    .replace(/ - /g, "-")
    //15-der rote hahn -> 15-der-rote-hahn
    .replace(/ /g, "-")
    //Umlaute aendern
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");

  console.log(newFilename);

  //Ordner SPLITDIR/15-der-rote-hahn entfernen (falls z.B. vorher schon splits mit anderer Traecklaenge erzeugt wurden)
  rmSync(splitDir + "/" + newFilename, { force: true, recursive: true });

  //15-der-rote-hahn.mp3 anlegen, damit CLI-Skript Datei lesen kann
  const newFile = newFilename + ".mp3";
  const newFilePath = splitDir + "/" + newFile;
  cpSync(file, newFilePath);

  //Label fuer nummerierte Benennung: 15 - Der rote Hahn -> Der rote Hahn
  const label = filename.replace(/\d{2,3} - /, "");

  //mp3 mit time- + autosplit-Methode trennen und in Unterordner speichern
  const outputDir = splitDir + "/" + newFilename;
  rmSync(outputDir, { force: true });
  //-t Tracklaenge 5 min, kein Track kuerzer als 2 min
  //-f Frame-Methode -> genauer
  //-a Autosplit bei Stille
  //-d Ausgabeordner
  const command = "cd " +
    splitDir +
    ' &&  mp3splt -t "5.00>2.00" -f -a -d ' +
    outputDir +
    " " +
    newFile;
  execSync(command, { stdio: "inherit" });

  //Dateien in Unterordner mit Nummerierung umbenennen
  let counter = 1;
  const timeMp3Files = readdirSync(outputDir);
  for (const oldFilename of timeMp3Files) {
    //01 - Der rote Hahn [1].mp3
    const prefix = counter < 10 ? "0" : "";
    const numberedFilename = prefix + counter + " - " + label + " [" + counter +
      "].mp3";

    //der-rote-hahn/15-der-rote-hahn_00m_00s__07m_00s.mp3 -> der-rote-hahn/01 - Der rote Hahn [1].mp3
    const oldFilePath = outputDir + "/" + oldFilename;
    const newFilePath = outputDir + "/" + numberedFilename;
    renameSync(oldFilePath, newFilePath);
    counter++;
  }

  //Fuer Splitskript umbenannte Datei 15-der-rote-hahn.mp3 loeschen
  rmSync(newFilePath);
}
