#!/usr/bin/env node

/**
 * ADD ALARM BATTERY v34.0.0
 * Ajoute alarm_battery capability à tous les drivers avec batteries
 */

const fs = require('fs');
const path = require('path');

console.log('\n⚠️ ADD ALARM BATTERY v34.0.0\n');

const rootDir = path.join(__dirname, '..');
const driversDir = path.join(rootDir, 'drivers');

const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

let updatedCount = 0;

drivers.forEach(driverName => {
  // Vérifier si le driver a une batterie
  const hasBattery = driverName.match(/(cr2032|cr2450|cr123a|cr1632|aaa|aa|other)$/i);
  if (!hasBattery) return;
  
  const composePath = path.join(driversDir, driverName, 'driver.compose.json');
  if (!fs.existsSync(composePath)) return;
  
  try {
    let compose = JSON.parse(fs.readFileSync(composePath, 'utf-8'));
    
    // Ajouter alarm_battery si manquant
    if (!compose.capabilities) compose.capabilities = [];
    if (!compose.capabilities.includes('alarm_battery')) {
      compose.capabilities.push('alarm_battery');
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      console.log(`✅ ${driverName} - alarm_battery added`);
      updatedCount++;
    }
  } catch (err) {
    console.log(`❌ ${driverName} - ERROR: ${err.message}`);
  }
});

console.log(`\n✅ alarm_battery ajouté à ${updatedCount} drivers\n`);
