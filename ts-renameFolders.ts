//Audio-Ordner umbenennen fuer Audio-Player
import { readFileSync, readdirSync, statSync, renameSync } from 'fs';
import slug from 'slug';

//Wo liegen die Ordner, die umbenannt werden sollen?
const createAudioDir = JSON.parse(readFileSync("config.json", "utf8")).mediaDir + "/audio";
//Ueber ueber filter-dirs des aktuellen modes gehen (hsp, kindermusik,...)
readdirSync(createAudioDir).forEach(folder => {
    const oldFolder = createAudioDir + "/" + folder;

    //Wenn es ein Ordner ist
    const stat = statSync(oldFolder);
    if (stat && stat.isDirectory()) {

        //Slug erstellen: 15 - Der rote Hahn -> 15-der-rote-hahn
        const newName = slug(folder, {
            lower: true,
            locale: 'de'
        });

        //Ordner umbenennen
        renameSync(oldFolder, createAudioDir + "/" + newName);
    }
});