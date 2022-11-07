//Webseite bauen und in passenden Ordner in Nextcloud kopieren
//node .\buildAudioWebsite.js wap | shp
import fs from 'fs-extra';
import {execSync} from 'child_process';

//Welche App soll gebaut werden wap vs. shp
const mode = process.argv[2] || "wap";

//Order wo der Quellcode fuer build liegt
const appDirs: Record<string, string> = {
    "wap": "AudioClient",
    "shp": "NewSHAudioClient"
};

//Wohin kommt der Website-Code
const websiteDir = fs.readJSONSync("config.json").audioDir + "/website/" + mode;

//Webseite bauen
console.log("use WSL!");
console.log("start build " + mode + " website and copy to " + websiteDir);

execSync("cd ../" + appDirs[mode] + " && ng build --configuration production --base-href=/" + mode + "/", { stdio: 'inherit' });
console.log("build done");

//Web-Verzeichnis in Nextcloud leeren
console.log("empty website dir " + websiteDir);
fs.emptyDirSync(websiteDir);

//Erstellte Webseite in Web-Verzeichnis in Nextcloud kopieren
console.log("copy app code to website dir");
fs.copySync("../" + appDirs[mode] + "/dist", websiteDir);
console.log("done");