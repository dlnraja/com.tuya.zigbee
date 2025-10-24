#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 RECHERCHE DRIVERS MANQUANTS DANS APP.JSON\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const driversDir = path.join(__dirname, '..', 'drivers');

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const missingDrivers = [];
const existingDrivers = [];

if (appJson.drivers) {
  appJson.drivers.forEach(driver => {
    const driverId = driver.id;
    const driverPath = path.join(driversDir, driverId);
    
    if (fs.existsSync(driverPath)) {
      existingDrivers.push(driverId);
    } else {
      missingDrivers.push(driverId);
      console.log(`   ❌ MANQUANT: ${driverId}`);
    }
  });
}

console.log(`\n📊 RÉSUMÉ:`);
console.log(`   Drivers dans app.json: ${appJson.drivers ? appJson.drivers.length : 0}`);
console.log(`   Existent sur disque: ${existingDrivers.length}`);
console.log(`   MANQUANTS: ${missingDrivers.length}`);

if (missingDrivers.length > 0) {
  console.log(`\n🔧 CORRECTION REQUISE!`);
  console.log(`   Ces ${missingDrivers.length} drivers doivent être retirés de app.json`);
  
  // Sauvegarder la liste
  const reportPath = path.join(__dirname, '..', 'MISSING_DRIVERS.json');
  fs.writeFileSync(reportPath, JSON.stringify({ missingDrivers, count: missingDrivers.length }, null, 2), 'utf8');
  console.log(`   💾 Liste sauvegardée: MISSING_DRIVERS.json`);
} else {
  console.log(`\n✅ Tous les drivers dans app.json existent!`);
}
