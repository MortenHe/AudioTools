//Vorlesedateien erzeugen fuer Hoerspiel-Check Ordner
import { readFileSync, existsSync } from 'fs';
import glob from "glob";
import path from "path";
import { execSync } from "child_process";

//Ordner fuer die eine Vorlesedatei erzeugt werden soll
const audioDir: string = JSON.parse(readFileSync("config.json", "utf-8")).audioDir;
const readFilesDirs = [
  audioDir + "/wap/mp3/extra/misc/check-kids",
  audioDir + "/wap/mp3/hsp/misc/anna-und-die-wilden-tiere",
  audioDir + "/wap/mp3/hsp/misc/checker-tobi",
  audioDir + "/wap/mp3/hsp/misc/99-seichte-fragen",
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
      !existsSync(readFilesDir + "/" + filename) &&
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
