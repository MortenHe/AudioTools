//Webseite bauen und in passenden Ordner in Nextcloud kopieren
//node .\buildAudioWebsite.js wap | shp

//Welche App soll gebaut werden wap vs. shp
const mode = process.argv[2] || "wap";

//Wohin kommt der Website-Code
const fs = require('fs-extra');
const websiteDir = fs.readJSONSync("config.json").audioDir + "/website/" + mode;

//Order wo der Quellcode fuer build liegt
const appDirs = {
    "wap": "AudioClient",
    "shp": "NewSHAudioClient"
};

//Webseite bauen
console.log("start build " + mode + " website");
const execSync = require('child_process').execSync;
execSync("cd ../" + appDirs[mode] + " && ng build --configuration production --base-href=/" + mode + "/", { stdio: 'inherit' });
console.log("build done");

//Web-Verzeichnis leeren
console.log("empty website dir");
fs.emptyDirSync(websiteDir);

//Erstellte Webseite in Web-Verzeichnis kopieren
console.log("copy app code to website dir");
fs.copySync("../" + appDirs[mode] + "/dist", websiteDir);
console.log("done");