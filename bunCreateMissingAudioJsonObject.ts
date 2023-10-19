//Ermitteln fuer welche Audio-Playlists auf dem lokalen System es noch keinen JSON-Eintrag gibt und die zugehoerigen JSON-Eintraege erstellen und ausgeben
//node .\createMissingAudioJsonObject
import { readFileSync } from "node:fs";
import { glob } from "glob"
import path from "node:path";

//Laenge der Playlist berechnen
import { getAudioDurationInSeconds } from "get-audio-duration";

//Zeit Formattierung laden: [5, 13, 22] => 05:13:22
import { time } from "timelite";

import config from "./config.json";

//Pfade wo die Dateien lokal liegen
const audioDir = config.audioDir;
const audioFilesDir = audioDir + "/wap/mp3";
const jsonDir = audioDir + "/wap/json/";

//Benennungen anhand des Ordners, in dem die Dateien liegen
const naming: Record<string, string> = {
  "conni": "Conni",
  "bibi": "Bibi Blocksberg",
  "bibi-tina": "Bibi und Tina",
  "pumuckl": "Pumuckl",
  "bob": "Bob der Baumeister",
  "bebl": "Benjamin Blümchen",
  "wieso": "Wieso Weshalb Warum",
  "erzaehl-mir-was": "Erzähl mir was",
  "anna-und-die-wilden-tiere": "Anna und die wilden Tiere",
  "checker-tobi": "Checker Tobi",
  "dinosaurs": "Team Dino",
  "albert-e": "Albert E. erklärt",
};

//Lokale Audio-Ordner sammeln
const audioFolders = new Set<string>();
const localFolders = glob.sync(audioFilesDir + "/*/*/*");
for (const localFolder of localFolders) {
  //hsp
  const topFolder = path.basename(path.dirname(path.dirname(localFolder)));

  //janosch
  const subFolder = path.basename(path.dirname(localFolder));

  //riesenparty
  const filename = path.basename(localFolder);

  //hsp/janosch/riesenparty
  audioFolders.add(topFolder + "/" + subFolder + "/" + filename);
}

//Audio-Infos aus JSON-Config-Dateien sammeln
const jsonAudioFiles = new Set<string>();
const jsonFiles = glob.sync(jsonDir + "/*/*.json");

for (const jsonFile of jsonFiles) {
  //hsp
  const topFolder = path.basename(path.dirname(jsonFile));

  //bobo
  const subFolder = path.basename(jsonFile, ".json");

  //Ueber Folder in bob.json gehen
  const jsonData: any[] = JSON.parse(readFileSync(jsonFile, "utf-8"));
  for (const jsonObj of jsonData) {
    //hsp/bobo/tv-01
    jsonAudioFiles.add(topFolder + "/" + subFolder + "/" + jsonObj.file);
  }
}

//Audio-Infos sammeln
const outputArray: any = {};

//Infos per Promise holen und merken
let durationPromises: Promise<any>[] = [];

//Ordner ermitteln, die in JSON-Config aber nicht im Dateisystem exisiteren
const missingAudioFolders = [...jsonAudioFiles].filter((audioFolder) =>
  !audioFolders.has(audioFolder)
);
if (missingAudioFolders.length) {
  console.log("Ordner aus Config, die nicht im Dateisystem sind");
  console.log(missingAudioFolders);
}

//Ueber Ordner gehen, fuer die es noch keinen JSON-Eintrag gibt und den JSON-Eintrag erstellen
const missingJsonFiles = [...audioFolders].filter((audioFolder) =>
  !jsonAudioFiles.has(audioFolder)
);
for (const missingJsonFile of missingJsonFiles) {
  //Wert wegen async in Variable speichern
  const folder = missingJsonFile;

  //bebl um Praefix "Benjamin Bluemchen" ableiten zu koennen
  const mode = path.basename(path.dirname(folder));

  //hsp/bibi-tina/15-der-rote-hahn -> 15-der-rote-hahn
  let name = path.basename(folder)
    //15-der-rote-hahn -> 15 der rote hahn
    .replace(/-/g, " ")
    //15 der rote hahn -> 15 - der rote hahn (nur wenn name mit Zahlen beginnt)
    .replace(/(\d+ )/, "$1- ")
    //15 - der rote hahn -> 15 - Der rote hahn (hahn -> Hahn spaeter haendisch)
    .replace(/ - [a-z]/g, (chr: string) => {
      return chr.toUpperCase();
    });

  //Praefix vorne dran, wenn definiert. 15 - Der Rote Hahn -> Bibi und Tina - 15 - Der Rote Hahn
  name = naming[mode] ? naming[mode] + " - " + name : name;

  //hsp/bibi-tina/15-der-rote-hahn -> 15-der-rote-hahn
  const file = path.basename(folder);

  //JSON-Objekt fuer diese Folge erstellen
  outputArray[folder] = {
    "name": name,
    "file": file,
    "added": new Date().toISOString().slice(0, 10),
  };

  //TODO: Pro Hörspiel einzeln Komplettlänge berechnet, bei js-Version alle Hörspiele gleichzeitig?

  //Ueber Dateien des Ordners gehen und Gesamtdauer ermitteln, readdir statt readdirsync fuer richtige Promise-Behandlung
  const files = glob.sync(audioFilesDir + "/" + folder + "/*.mp3");
  durationPromises = [];
  for (const file of files) {
    durationPromises.push(
      getAudioDurationInSeconds(file)
    );
  }

  //warten bis alle Promises abgeschlossen sind
  const fileLengths = await Promise.all(durationPromises);
  let totalLength = 0;
  for (const fileLength of fileLengths) {
    totalLength += fileLength;
  }

  //Gesamtzeit als formattierten String. Zunaechst Float zu int: 13.4323 => 13
  let totalSeconds = Math.trunc(totalLength);

  //Umrechung der Sekunden in [h, m, s] fuer formattierte Darstellung
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  //h, m, s-Werte in Array packen
  const timeOutput = [hours, minutes, seconds];

  //[2,44,1] => 02:44:01
  const timeOutputString = time.str(timeOutput);

  //Laenge setzen
  outputArray[folder]["length"] = timeOutputString;

  //JSON-Objekt-Array ausgeben
  console.log(",");
  console.log(JSON.stringify(outputArray[folder], null, 4));
}
console.log("run createReadfiles");
