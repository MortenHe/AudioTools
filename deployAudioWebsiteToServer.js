//Webseite bauen und auf Server laden
//node .\deployWebsiteToServer.js pw | marlen | laila

//ggf. Projekt nur bauen oder nur hochladen (wenn es vorher schon gebaut wurde)
const buildModes = [
    "build & upload",
    "build only",
    "upload only"
];

//Async Methode fuer Await Aufrufe
async function main() {

    //Welche Website (pw / marlen / vb) wohin deployen (pw / marlen / vb)
    const fs = require('fs-extra');
    const targetMachine = process.argv[2];
    const buildMode = parseInt(process.argv[3]) || 0;
    const connection = fs.readJSONSync("config.json").connections[targetMachine];
    console.log("build and deploy audio (" + connection.assetId + ") to server " + targetMachine + ": " + connection.host);
    console.log("build mode: " + buildModes[buildMode]);

    //Unter welchem Unterpfad wird die App auf dem Server laufen?
    const base_href = "wap";

    //Pfad wo Webseiten-Dateien auf Server liegen sollen
    let server_audio_path = "/var/www/html/" + base_href;

    //Projekt bauen
    if (buildMode === 0 || buildMode === 1) {
        console.log("start build");
        const execSync = require('child_process').execSync;
        execSync("ng build -c=" + targetMachine + " --base-href=/" + base_href + "/", { stdio: 'inherit' });
        console.log("build done");
    }
    else {
        console.log("no build");
    }

    //Wenn es keinen Upload gibt. Hier abbrechen
    if (buildMode !== 0 && buildMode !== 2) {
        console.log("no upload");
        process.exit();
    }

    //htaccess Schablone in dist Ordner kopieren und durch Pattern Ersetzung anpassen
    const replace = require("replace");
    console.log("copy htacces");
    await fs.copy('.htaccess', '../../dist/htaccess');

    console.log("update htacces");
    await replace({
        regex: "###PATH###",
        replacement: base_href,
        paths: ['../../dist/htaccess'],
        recursive: true,
        silent: true
    });

    //JSON-Folder zippen
    const zipFolder = require('zip-a-folder');
    console.log("zip data");
    await zipFolder.zip('../../dist', '../../myDist.zip')

    //SSH-Verbindung um Shell-Befehle auszufuehren (unzip, chmod,...)
    const SSH2Promise = require('ssh2-promise');
    const ssh = new SSH2Promise({
        host: connection.host,
        username: connection.user,
        password: connection.password
    });

    //sftp-Verbindung um Webseiten-Dateien hochzuladen
    const Client = require('ssh2-sftp-client');
    const sftp = new Client();
    await sftp.connect({
        host: connection.host,
        port: '22',
        username: connection.user,
        password: connection.password
    });

    //gibt es schon einen Ordner (wap)
    console.log("check if exists: " + server_audio_path)
    const dir_exists = await sftp.exists(server_audio_path);

    //Wenn Ordner (wap) existiert, diesen rekursiv loeschen
    if (dir_exists) {
        console.log("delete folder " + server_audio_path);
        await sftp.rmdir(server_audio_path, true);
    }

    //neuen Ordner (wap) anlegen
    console.log("create folder " + server_audio_path);
    await sftp.mkdir(server_audio_path);

    //gezippten Webseiten-Code hochladen
    console.log("upload zip file");
    await sftp.fastPut("../../myDist.zip", server_audio_path + "/myDist.zip");

    //per SSH verbinden, damit Shell-Befehle ausgefuehrt werden koennen
    console.log("connect via ssh");
    await ssh.connect();

    //Webseiten-Code entzippen
    console.log("unzip file");
    await ssh.exec("cd " + server_audio_path + " && unzip myDist.zip");

    //htaccess file umbenennen (htaccess -> .htaccess)
    console.log("rename htaccess file");
    await ssh.exec("mv " + server_audio_path + "/htaccess " + server_audio_path + "/.htaccess")

    //Zip-File loeschen
    console.log("delete zip file");
    await sftp.delete(server_audio_path + "/myDist.zip");

    //Rechte anpassen, damit Daten in Webseite geladen werden koennen
    console.log("chmod 0777");
    await ssh.exec("chmod -R 0777 /var/www/html");

    //Programm beenden
    console.log("build process done");
    await ssh.close();
    await sftp.end();
    process.exit();
}

//Deployment starten
main();