const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '..', 'driver-registry.json');
const appJsonPath = path.join(__dirname, '..', 'app.json');

if (!fs.existsSync(registryPath)) {
  console.error('Fichier de registre introuvable');
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Mettre à jour la section drivers
appJson.drivers = registry.drivers.map(driver => 
  path.relative(path.dirname(appJsonPath), driver.path).replace(/\\/g, '/') + '/driver.compose.json'
);

// Écrire le nouveau app.json
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
console.log('app.json mis à jour avec succès');
