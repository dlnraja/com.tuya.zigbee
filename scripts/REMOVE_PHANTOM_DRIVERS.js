#!/usr/bin/env node

/**
 * REMOVE PHANTOM DRIVERS v4.0.0
 * Removes phantom drivers from app.json that don't have actual driver folders
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const driversDir = path.join(__dirname, '..', 'drivers');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

console.log('\n🔧 REMOVING PHANTOM DRIVERS\n');

// Get list of actual driver folders
const actualDrivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

console.log(`✓ Found ${actualDrivers.length} actual driver folders`);

let removed = 0;
if (appJson.drivers) {
  const before = appJson.drivers.length;
  
  appJson.drivers = appJson.drivers.filter(driver => {
    const exists = actualDrivers.includes(driver.id);
    if (!exists) {
      console.log(`❌ Removed phantom driver: ${driver.id}`);
      removed++;
      return false;
    }
    return true;
  });
  
  if (removed > 0) {
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log(`\n✅ Removed ${removed} phantom driver(s) from app.json`);
    console.log(`Drivers: ${before} → ${appJson.drivers.length}\n`);
  } else {
    console.log('\n✅ No phantom drivers found\n');
  }
}
