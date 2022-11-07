//Vorlesedateien erzeugen fuer Hoerspiel-Check Ordner
import fs from "fs-extra";
import glob from "glob";
import path from "path";
import { execSync } from "child_process";

//Ordner fuer die eine Vorlesedatei erzeugt werden soll
const audioDir: string = fs.readJSONSync("config.json").audioDir;
const readFilesDirs = [
  audioDir + "/wap/mp3/extra/misc/check-kids",
  audioDir + "/wap/mp3/hsp/misc/anna-und-die-wilden-tiere",
  audioDir + "/wap/mp3/hsp/misc/checker-tobi",
];

//mp3 in Check Ordnern holen
for (const readFilesDir of readFilesDirs) {
  const mp3Files = glob.sync(readFilesDir + "/*.mp3") as string[];
  for (const mp3File of mp3Files) {
    //"Anna und die wilden Tiere - Anna lernt reiten"
    const titleToRead = path.basename(mp3File, ".mp3");

    //"Anna und die wilden Tiere - Anna lernt reiten - read.mp3"
    const filename = titleToRead + " - read.mp3";

    //Wenn read-Datei noch nicht existiert, diese erzeugen
    if (
      !fs.existsSync(readFilesDir + "/" + filename) &&
      !titleToRead.endsWith(" - read")
    ) {
      console.log("create " + filename);
      const pico2waveTTScommand = `
                                pico2wave -l de-DE -w ${__dirname}/tts.wav "${titleToRead}" &&
                                ffmpeg -i ${__dirname}/tts.wav -af equalizer=f=300:t=h:width=200:g=-30 ${__dirname}/tts-eq.wav -hide_banner -loglevel error -y &&
                                ffmpeg -i ${__dirname}/tts-eq.wav -af acompressor=threshold=-11dB:ratio=9:attack=200:release=1000:makeup=8 "${readFilesDir}/${filename}" -hide_banner -loglevel error -y`;
      execSync(pico2waveTTScommand);
    }
  }
}
