//Audio-Ordner umbenennen fuer Audio-Player

//Zugriff auf Dateisystem
const fs = require('fs-extra');
const slugify = require('slugify')

//Wo liegen die Ordner, die umbenannt werden sollen?
const createAudioDir = fs.readJsonSync("config.json").mediaDir + "/audio";

//Ueber ueber filter-dirs des aktuellen modes gehen (hsp, kindermusik,...)
fs.readdirSync(createAudioDir).forEach(folder => {
    const oldFolder = createAudioDir + "/" + folder;

    //Wenn es ein Ordner ist
    const stat = fs.statSync(oldFolder);
    if (stat && stat.isDirectory()) {

        //Slug erstellen: 15 - Der rote Hahn -> 15-der-rote-hahn
        const newName = slugify(folder, {
            lower: true,
            locale: 'de'
        });

        //Ordner umbenennen
        fs.renameSync(oldFolder, createAudioDir + "/" + newName);
    }
});