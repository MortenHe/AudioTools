//Audio-Ordner erstellen fuer Dateien
import { readFileSync, readdirSync, statSync, renameSync, mkdir, cpSync, mkdirSync, rmdirSync, rmSync } from 'fs';
import slug from 'slug';

//Wo liegen die Dateien fuer die Ordner erstellt werden sollen?
const mediaAudioDir = JSON.parse(readFileSync("config.json", "utf8")).mediaDir + "/audio";
readdirSync(mediaAudioDir).forEach(folderItem => {
    const stat = statSync(mediaAudioDir + "/" + folderItem);
    if (stat && stat.isFile()) {

        //Praefix wegstreichen: Anna und die wilden Tiere - Papageien in Peru.mp3 -> Papageien in Peru
        let folderNameLong = folderItem.replace(".mp3", "");
        const match = folderNameLong.match(/(- (.*))/);
        if (match && match[2]) {
            folderNameLong = match[2];
        }

        //Slug erstellen: Papageien in Peru -> papageien-in-peru
        const folderNameShort = slug(folderNameLong, {
            lower: true,
            locale: 'de'
        });
        rmSync(mediaAudioDir + "/" + folderNameShort, { force: true, recursive: true });
        mkdirSync(mediaAudioDir + "/" + folderNameShort);
        renameSync(mediaAudioDir + "/" + folderItem, mediaAudioDir + "/" + folderNameShort + "/01 - " + folderNameLong + ".mp3");
    }
});