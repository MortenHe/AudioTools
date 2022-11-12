//Webseite bauen und in passenden Ordner in Nextcloud kopieren
//node .\buildAudioWebsite.js wap | shp
import { cpSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';

//Welche App soll gebaut werden wap vs. shp
const mode = process.argv[2] || "wap";

//Order wo der Quellcode fuer build liegt
const appDirs: Record<string, string> = {
    "wap": "AudioClient",
    "shp": "NewSHAudioClient"
};

//Wohin kommt der Website-Code
const websiteDir = JSON.parse(readFileSync("config.json", "utf-8")).audioDir + "/website/" + mode;

//Webseite bauen
console.log("use WSL!");
console.log("start build " + mode + " website and copy to " + websiteDir);

execSync("cd ../" + appDirs[mode] + " && ng build --configuration production --base-href=/" + mode + "/", { stdio: 'inherit' });
console.log("build done");

//Web-Verzeichnis in Nextcloud loeschen und neu anlegen
console.log("empty website dir " + websiteDir);
rmSync(websiteDir, { force: true, recursive: true });
mkdirSync(websiteDir);

//Erstellte Webseite in Web-Verzeichnis in Nextcloud kopieren
console.log("copy app code to website dir");
cpSync("../" + appDirs[mode] + "/dist", websiteDir, { recursive: true });
console.log("done");