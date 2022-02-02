//Cue Datei und Textmarken-Datei (Audacity) erstellen aus musicbrainz-Info

//libs
const fs = require('fs-extra');
const glob = require("glob");
const path = require("path");
const timelite = require("timelite");
const xml2js = require('xml2js');
const request = require('request');

//Modus laden
const link = {
    performer: "",
    url: ""
};

//Datei aus Splitdir ermitteln und daraus Infos ableiten
const splitDir = fs.readJsonSync("config.json").mediaDir + "/split";
const mp3File = path.basename(glob.sync(splitDir + "/*.mp3")[0], '.mp3');
const fileParts = mp3File.split(" - ");

//Header setzen fuer Nutzung der musicbrainz-API
const options = {
    url: link.url,
    headers: { "User-Agent": "CueGetter/1.0.0 ( http://github.com/MortenHe )" }
};

//Inhalt der Textmarkendatei
let labelOutput = "";

//Inhalt der CUE-Datei
let cueOutput = 'PERFORMER "' + link.performer + '"\n';
cueOutput += 'TITLE "' + fileParts[1] + ' (' + fileParts[0] + ')"\n';
cueOutput += 'FILE "' + mp3File + '.mp3" MP3\n';

//Laenge der einzelnen Dateien aufsummieren
let summedTrackTime = 0;

//XML-Infos per HTTP laden und als JSON parsen
const parser = new xml2js.Parser();
request(options, (err, response, xmlData) => {
    parser.parseString(xmlData, function (err, result) {

        //Ueber Liste der einzelnen Tracks gehen
        const tracks = result["metadata"]["release"][0]["medium-list"][0]["medium"][0]["track-list"][0]["track"];
        tracks.forEach((track, index) => {

            //min, sec und  frames berechnen fuer CUE-INDEX
            const min = Math.floor((summedTrackTime / 1000) / 60);
            const sec = Math.floor((summedTrackTime / 1000) % 60);
            const frames = Math.ceil((summedTrackTime % 1000) * 0.075);

            //INDEX-Format erstellen: [2, 25, 22] => 02:25:22
            const indexTime = timelite.time.str([min, sec, frames]);

            //Trackindex berechnen und Titel auslesen
            const trackIndex = (index + 1) < 10 ? '0' + (index + 1) : index + 1;
            const trackTitle = track["recording"][0]["title"][0];

            //Textmarken-Output schreiben
            labelOutput += (summedTrackTime / 1000) + "\t" + trackIndex + " - " + trackTitle + "\n";

            //CUE-Output schreiben
            cueOutput += '  TRACK ' + trackIndex + ' AUDIO\n';
            cueOutput += '    TITLE "' + trackTitle + '"\n';
            cueOutput += '    PERFORMER "' + link.performer + '"\n';
            cueOutput += '    INDEX 01 "' + indexTime + '"\n';

            //Einzelne Tracklaengen aufsummieren
            summedTrackTime += parseInt(track["length"][0]);
        });

        //Textmarken und CUE-Datei schreiben
        fs.writeFileSync(splitDir + "/" + mp3File + ".txt", labelOutput);
        fs.writeFileSync(splitDir + "/" + mp3File + ".cue", cueOutput, 'ascii');

        //Ordner fuer Einzeltrack anlegen
        const folderPath = splitDir + "/" + mp3File;
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath);
        }
    });
});