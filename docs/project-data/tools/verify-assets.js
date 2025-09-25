const fs = require('fs');
const path = require('path');

// Root des drivers (tous sous-dossiers seront scannés récursivement)
const driversRoot = path.join(__dirname, '..', 'drivers');
// Fichiers requis pour un driver Homey standard
const requiredFiles = [
  'driver.compose.json',
  'driver.js',
  'device.js',
  'assets/icon.svg',
  'assets/images/large.png',
  'assets/images/small.png'
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
  // Recherche récursive de répertoires driver (présence de driver.compose.json ou device.js)
  const results = [];
  if (!fs.existsSync(basePath)) return results;

  const stack = [basePath];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    const hasDriverCompose = entries.some(e => e.isFile() && e.name === 'driver.compose.json');
    const hasDeviceOrDriver = entries.some(e => e.isFile() && (e.name === 'device.js' || e.name === 'driver.js'));
    if (hasDriverCompose || hasDeviceOrDriver) {
      // On considère ce dossier comme racine d'un driver
      results.push(current);
      continue; // ne pas descendre plus bas
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const name = entry.name;
        if (['.git', 'node_modules', 'final-release', 'releases', '.homeycompose'].includes(name)) continue;
        stack.push(path.join(current, name));
      }
    }
  }
  return results;
}

function main() {
  const driverDirs = findDriverDirs(driversRoot);
  const report = {};

  for (const driverPath of driverDirs) {
    const rel = path.relative(driversRoot, driverPath) || path.basename(driverPath);
    console.log(`Scanning driver: ${rel}`);
    const missingFiles = checkDriver(driverPath);
    if (missingFiles.length > 0) {
      console.log(`Missing files: ${missingFiles.join(', ')}`);
      report[rel] = missingFiles;
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
