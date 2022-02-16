//Vorlesedateien erzeugen fuer stt und random Joker

//libraries laden fuer Dateizugriff
const fs = require('fs-extra');
const glob = require("glob");
const path = require("path");
const execSync = require('child_process').execSync;

//Pfade wo die Dateien lokal liegen 
const audioDir = fs.readJSONSync("config.json").audioDir;
const readFilesDir = audioDir + "/wap/wav";
const jsonDir = audioDir + "/wap/json/";

//Audio-Infos aus JSON-Config-Dateien sammeln
const jsonFiles = glob.sync(jsonDir + "/*/*.json");
for (const jsonFile of jsonFiles) {

    //hsp
    const topFolder = path.basename(path.dirname(jsonFile));

    //bobo
    const subFolder = path.basename(jsonFile, ".json");

    //Ueber Playlists in bob.json gehen
    const jsonData = fs.readJsonSync(jsonFile);
    for (const jsonObj of jsonData) {

        //hsp-bobo-kindergarten.wav
        const filename = topFolder + "-" + subFolder + "-" + jsonObj.file + ".wav";

        //Bobo Siebenschläfer - Willkommen im Kindergarten
        //TODO: Autorälli, etc.
        const titleToRead = jsonObj.name.replace(/ \- \d+ \-/, "");;
        //console.log(titleToRead);
        const lang = jsonObj.lang || "de-DE";

        //Fehlende Sprachdatei berechnen, normalisieren und in Nextcloud ablegen
        if (!fs.existsSync(readFilesDir + "/" + filename)) {
            console.log("create " + filename);
            const pico2waveTTScommand = `
                                pico2wave -l ${lang} -w ${__dirname}/tts.wav "${titleToRead}" &&
                                ffmpeg -i ${__dirname}/tts.wav -af equalizer=f=300:t=h:width=200:g=-30 ${__dirname}/tts-eq.wav -hide_banner -loglevel error -y &&
                                ffmpeg -i ${__dirname}/tts-eq.wav -af acompressor=threshold=-11dB:ratio=9:attack=200:release=1000:makeup=8 ${readFilesDir}/${filename} -hide_banner -loglevel error -y                            `;
            execSync(pico2waveTTScommand);
        }
    }
}