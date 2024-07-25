#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const yargs = require('yargs');

// Define the directories
const sourceFolder = 'C:\\Users\\Martin\\Desktop\\Nextcloud\\Raspi\\audio\\shp\\kids\\Neu 2024';
const mixFolder = 'C:\\Users\\Martin\\Desktop\\Nextcloud\\Raspi\\audio\\wap\\mp3\\extra\\misc\\heart-mix-luis';

// Parse command line arguments
const argv = yargs
  .usage('Usage: $0 <prefix>')
  .demandCommand(1, 'You must provide a prefix to search for the file.')
  .help()
  .alias('help', 'h')
  .argv;

const prefix = argv._[0].toLowerCase();

const copyAndRenameMp3 = async (prefix) => {
  try {
    // Get all files in the source folder
    const files = await fs.readdir(sourceFolder);

    // Filter MP3 files that start with the prefix
    const matchingFiles = files.filter(file => file.toLowerCase().startsWith(prefix) && file.endsWith('.mp3'));

    if (matchingFiles.length === 0) {
      console.error(`No files found with prefix "${prefix}".`);
      return;
    }

    const fileName = matchingFiles[0];
    const sourcePath = path.join(sourceFolder, fileName);
    const targetPath = path.join(mixFolder, `00 - ${fileName}`);

    // Copy the file
    await fs.copy(sourcePath, targetPath);

    // Get all files in the mix folder
    const mixFiles = await fs.readdir(mixFolder);

    // Filter and sort MP3 files, excluding the newly copied file
    const mp3Files = mixFiles.filter(file => file.endsWith('.mp3')).sort((a, b) => {
      const aNum = parseInt(a.split(' - ')[0]);
      const bNum = parseInt(b.split(' - ')[0]);
      return aNum - bNum;
    });

    // Rename files to maintain numbering, starting from 01
    for (let i = 0; i < mp3Files.length; i++) {
      const oldFilePath = path.join(mixFolder, mp3Files[i]);
      const newFileName = `${String(i + 1).padStart(2, '0')} - ${mp3Files[i].split(' - ').slice(1).join(' - ')}`;
      const newFilePath = path.join(mixFolder, newFileName);
      if (oldFilePath !== newFilePath) {
        await fs.rename(oldFilePath, newFilePath);
      }
    }

    console.log(`File "${fileName}" copied and renamed successfully as "00 - ${fileName}".`);
  } catch (error) {
    console.error('Error:', error);
  }
};

copyAndRenameMp3(prefix);
