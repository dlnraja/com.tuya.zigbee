const fs = require('fs');
const path = require('path');

const driversPath = path.join(__dirname, '..', 'drivers', 'tuya_zigbee');
const requiredFiles = [
  'device.js',
  'driver.compose.json',
  'icon.svg',
  'images/icon.svg',
  'images/learnmode.svg',
  'metadata.json'
];

function checkDriver(driverPath) {
  const missingFiles = [];
  for (const file of requiredFiles) {
    const filePath = path.join(driverPath, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }
  return missingFiles;
}

function findDriverDirs(basePath) {
  const driverDirs = [];
  const categories = fs.readdirSync(basePath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  for (const category of categories) {
    const categoryPath = path.join(basePath, category);
    const drivers = fs.readdirSync(categoryPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(category, dirent.name));
    driverDirs.push(...drivers);
  }
  return driverDirs;
}

function main() {
  const driverDirs = findDriverDirs(driversPath);
  const report = {};
  
  for (const driverDir of driverDirs) {
    const driverPath = path.join(driversPath, driverDir);
    console.log(`Scanning driver: ${driverDir}`);
    const missingFiles = checkDriver(driverPath);
    if (missingFiles.length > 0) {
      console.log(`Missing files: ${missingFiles.join(', ')}`);
      report[driverDir] = missingFiles;
    }
  }

  if (Object.keys(report).length === 0) {
    console.log('Tous les drivers ont les fichiers requis.');
  } else {
    console.log('Drivers avec fichiers manquants :');
    console.log(JSON.stringify(report, null, 2));
  }
}

main();
