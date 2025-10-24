#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🔍 FIXING ORPHAN DRIVER REFERENCES\n');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const driversDir = path.join(__dirname, '..', 'drivers');

// Load app.json
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

// Get list of actual driver folders
const actualDrivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

console.log(`✓ Found ${actualDrivers.length} actual driver folders`);

// Find orphan references in app.json
const before = appJson.drivers.length;
const orphans = [];

appJson.drivers = appJson.drivers.filter(driver => {
  const exists = actualDrivers.includes(driver.id);
  if (!exists) {
    orphans.push(driver.id);
    console.log(`❌ Orphan: ${driver.id}`);
    return false;
  }
  return true;
});

if (orphans.length > 0) {
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log(`\n✅ Removed ${orphans.length} orphan references`);
  console.log(`Drivers: ${before} → ${appJson.drivers.length}\n`);
  console.log('Orphans removed:');
  orphans.forEach(id => console.log(`  - ${id}`));
} else {
  console.log('\n✅ No orphan references found\n');
}
