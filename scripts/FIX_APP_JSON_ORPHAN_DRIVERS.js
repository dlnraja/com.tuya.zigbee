#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP_JSON = path.join(ROOT, 'app.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

console.log('🔧 Nettoyage des références orphelines dans app.json\n');

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

// Obtenir la liste des drivers existants
const existingDrivers = new Set(
  fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
);

console.log(`📂 ${existingDrivers.size} drivers trouvés dans /drivers\n`);

// Vérifier les drivers dans app.json
const orphans = [];
const validDrivers = [];

if (appJson.drivers) {
  for (const driver of appJson.drivers) {
    if (existingDrivers.has(driver.id)) {
      validDrivers.push(driver);
    } else {
      orphans.push(driver.id);
      console.log(`❌ Driver orphelin trouvé: ${driver.id}`);
    }
  }
}

if (orphans.length > 0) {
  console.log(`\n🧹 Suppression de ${orphans.length} driver(s) orphelin(s):\n`);
  orphans.forEach(id => console.log(`   - ${id}`));
  
  // Mettre à jour app.json
  appJson.drivers = validDrivers;
  
  // Sauvegarder
  fs.writeFileSync(APP_JSON, JSON.stringify(appJson, null, 2) + '\n');
  
  console.log(`\n✅ app.json nettoyé: ${validDrivers.length} drivers valides restants\n`);
} else {
  console.log('✅ Aucun driver orphelin trouvé - app.json est propre\n');
}
