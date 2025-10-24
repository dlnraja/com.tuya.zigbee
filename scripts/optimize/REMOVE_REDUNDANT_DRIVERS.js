#!/usr/bin/env node
'use strict';

/**
 * REMOVE REDUNDANT DRIVERS
 * 
 * Supprime les drivers redondants ou très spécifiques
 * pour atteindre target de 220 drivers
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 REMOVE REDUNDANT DRIVERS\n');

const appJsonPath = path.join(__dirname, '../../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

console.log(`📊 Drivers before: ${appJson.drivers.length}\n`);
console.log(`🎯 Target: 220 drivers\n`);
console.log(`❌ Need to remove: ${appJson.drivers.length - 220}\n`);

// Backup
const backupPath = path.join(__dirname, `../../app.json.backup.remove.${Date.now()}`);
fs.writeFileSync(backupPath, JSON.stringify(appJson, null, 2));

// Drivers to potentially remove (very specific/redundant)
const toRemove = [
  // Internal variants (already have AC/battery versions)
  //_internal$/,
  // Xiaomi (have dedicated app)
  /^xiaomi_/,
  // Aqara (have dedicated app)  
  /^aqara_/,
  // Very specific variants
  /_zigbee_204z_/,
  /_dd_/,
  /_tank_level_/,
  /_pro$/,
  // Rare devices
  /projector_screen/,
  /pool_pump/,
  /solar_panel/,
  /pet_feeder/,
  /milight/,
  /irrigation/,
  /sprinkler/,
  /hvac_controller/,
  /shade_controller/,
  /ceiling_light/,
  /fan_controller/,
  /_relay_/,
  /rgb_led/,
];

const driversToRemove = [];

appJson.drivers.forEach(driver => {
  const shouldRemove = toRemove.some(pattern => pattern.test(driver.id));
  
  if (shouldRemove) {
    driversToRemove.push(driver.id);
    console.log(`❌ Removing: ${driver.id}`);
  }
});

// Filter out
const finalDrivers = appJson.drivers.filter(d => !driversToRemove.includes(d.id));

// If still above 220, remove more (gang variants keep only 1,2,3,4)
if (finalDrivers.length > 220) {
  const toRemoveMore = finalDrivers.filter(d => 
    d.id.includes('_5gang') || 
    d.id.includes('_6gang') || 
    d.id.includes('_8gang')
  );
  
  toRemoveMore.forEach(d => {
    console.log(`❌ Removing gang variant: ${d.id}`);
  });
  
  const finalFiltered = finalDrivers.filter(d => 
    !d.id.includes('_5gang') && 
    !d.id.includes('_6gang') && 
    !d.id.includes('_8gang')
  );
  
  appJson.drivers = finalFiltered;
} else {
  appJson.drivers = finalDrivers;
}

console.log(`\n📊 FINAL RESULTS:\n`);
console.log(`Before: 253 drivers`);
console.log(`Removed: ${driversToRemove.length + (253 - appJson.drivers.length - driversToRemove.length)} drivers`);
console.log(`After: ${appJson.drivers.length} drivers`);
console.log(`Target: 220 drivers`);
console.log(`Status: ${appJson.drivers.length <= 220 ? '✅ TARGET REACHED!' : `⚠️  Still ${appJson.drivers.length - 220} above`}\n`);

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log(`✅ app.json updated\n`);
console.log(`💾 Backup: ${path.basename(backupPath)}\n`);

if (appJson.drivers.length <= 220) {
  console.log('🎉 SUCCESS! Ready to publish!\n');
} else {
  console.log(`⚠️  Need to remove ${appJson.drivers.length - 220} more drivers\n`);
}
