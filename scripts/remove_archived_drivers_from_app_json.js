#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 SUPPRESSION DES DRIVERS ARCHIVÉS DE APP.JSON\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const driversDir = path.join(__dirname, '..', 'drivers');

// Lister tous les drivers archivés
const archivedDrivers = fs.readdirSync(path.join(__dirname, '..'))
  .filter(d => d.startsWith('.') && d.endsWith('.archived'))
  .map(d => String(d).replace(/^\./, '').replace(/\.archived$/, ''));

console.log(`📋 ${archivedDrivers.length} drivers archivés trouvés:\n`);
archivedDrivers.forEach(d => console.log(`   - ${d}`));

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Backup
const backupPath = appJsonPath + '.backup-remove-archived.' + Date.now();
fs.copyFileSync(appJsonPath, backupPath);
console.log(`\n💾 Backup: ${path.basename(backupPath)}`);

// Filtrer les drivers
const beforeCount = appJson.drivers ? appJson.drivers.length : 0;
if (appJson.drivers) {
  appJson.drivers = appJson.drivers.filter(driver => {
    const driverId = driver.id;
    if (archivedDrivers.includes(driverId)) {
      console.log(`   ❌ Supprimé: ${driverId}`);
      return false;
    }
    return true;
  });
}
const afterCount = appJson.drivers ? appJson.drivers.length : 0;

console.log(`\n📊 RÉSULTAT:`);
console.log(`   Avant: ${beforeCount} drivers`);
console.log(`   Après: ${afterCount} drivers`);
console.log(`   Supprimés: ${beforeCount - afterCount}`);

// Sauvegarder
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');

console.log(`\n✅ app.json mis à jour!`);
console.log(`\n💡 PROCHAINES ÉTAPES:`);
console.log(`   1. homey app build`);
console.log(`   2. homey app validate --level publish`);
