//Vorlesedateien erzeugen fuer Hoerspiel-Check Ordner
const fs = require("fs-extra");
const glob = require("glob");
const path = require("path");
const execSync = require("child_process").execSync;

//mp3 in Check Ordner holen
const readFilesDir =
  fs.readJSONSync("config.json").audioDir + "/wap/mp3/extra/misc/check-kids";
const mp3Files = glob.sync(readFilesDir + "/*.mp3");
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
