#!/usr/bin/env node
'use strict';

/**
 * AUTO FIX IF BUILD FAILS
 * 
 * Si GitHub Actions ou Homey build échoue,
 * ce script applique automatiquement les corrections.
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 AUTO FIX IF BUILD FAILS\n');

const appJsonPath = path.join(__dirname, '../../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const currentCount = appJson.drivers.length;

console.log(`📊 Current drivers: ${currentCount}\n`);

if (currentCount <= 220) {
  console.log('✅ Already under target (220)\n');
  console.log('If build still fails, issue is NOT driver count.\n');
  console.log('Possible causes:');
  console.log('  - Validation error (check cluster IDs)');
  console.log('  - Network timeout');
  console.log('  - Homey server issue');
  console.log('  - File corruption\n');
  
  console.log('Manual checks:');
  console.log('  1. homey app validate --level publish');
  console.log('  2. Check app.json syntax');
  console.log('  3. Verify manufacturer IDs format');
  console.log('  4. Check descriptions length\n');
  
  process.exit(0);
}

// If still above 220, remove more
console.log(`⚠️  Still ${currentCount - 220} above target\n`);
console.log('🔧 Removing 10 most rare drivers...\n');

// Backup
const backupPath = path.join(__dirname, `../../app.json.backup.autofix.${Date.now()}`);
fs.writeFileSync(backupPath, JSON.stringify(appJson, null, 2));

// Drivers to remove (most rare/specific)
const toRemove = [
  /projector/,
  /pool_pump/,
  /irrigation/,
  /sprinkler/,
  /milight/,
  /_8gang/,
  /_6gang/,
  /hvac_controller/,
  /shade_controller/,
  /fan_controller/
];

const driversToRemove = [];

appJson.drivers.forEach(driver => {
  if (driversToRemove.length >= 10) return;
  
  const shouldRemove = toRemove.some(pattern => pattern.test(driver.id));
  
  if (shouldRemove && !driversToRemove.includes(driver.id)) {
    driversToRemove.push(driver.id);
    console.log(`❌ Removing: ${driver.id}`);
  }
});

// Remove
const finalDrivers = appJson.drivers.filter(d => !driversToRemove.includes(d.id));
appJson.drivers = finalDrivers;

console.log(`\n📊 RESULTS:\n`);
console.log(`Before: ${currentCount}`);
console.log(`Removed: ${driversToRemove.length}`);
console.log(`After: ${appJson.drivers.length}`);
console.log(`Target: 220`);
console.log(`Status: ${appJson.drivers.length <= 220 ? '✅ REACHED' : `⚠️  Still ${appJson.drivers.length - 220} above`}\n`);

// Save
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log(`✅ app.json updated\n`);
console.log(`💾 Backup: ${path.basename(backupPath)}\n`);

console.log('Next steps:');
console.log('1. homey app validate --level publish');
console.log('2. git add app.json');
console.log('3. git commit -m "fix: Remove 10 rare drivers for build"');
console.log('4. git push origin master --force');
console.log('5. Monitor GitHub Actions again\n');
