#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🧹 CLEANING ALL ORPHAN REFERENCES FROM APP.JSON\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const driversDir = path.join(__dirname, '..', 'drivers');

// Load app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

// Get actual drivers
const actualDrivers = new Set(
  fs.readdirSync(driversDir)
    .filter(d => fs.statSync(path.join(driversDir, d)).isDirectory())
);

console.log(`📁 Actual driver folders: ${actualDrivers.size}`);
console.log(`📄 Drivers in app.json: ${appJson.drivers.length}`);

// Find and remove orphans
const orphans = [];
const before = appJson.drivers.length;

appJson.drivers = appJson.drivers.filter(driver => {
  // Check if driver folder exists
  const driverPath = path.join(driversDir, driver.id);
  const exists = fs.existsSync(driverPath);
  
  // Check if driver.compose.json exists
  const composeExists = exists && fs.existsSync(path.join(driverPath, 'driver.compose.json'));
  
  if (!exists || !composeExists) {
    orphans.push(driver.id);
    console.log(`❌ Removing: ${driver.id} (${!exists ? 'folder missing' : 'compose missing'})`);
    return false;
  }
  return true;
});

if (orphans.length > 0) {
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log(`\n✅ Cleaned ${orphans.length} orphan(s)`);
  console.log(`📊 Drivers: ${before} → ${appJson.drivers.length}\n`);
} else {
  console.log('\n✅ No orphans found - app.json is clean\n');
}
