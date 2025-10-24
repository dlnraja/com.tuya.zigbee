#!/usr/bin/env node

/**
 * REMOVE PHANTOM DRIVER
 * Supprime motion_sensor_illuminance_battery de app.json
 */

const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));

console.log('\n🔧 REMOVING PHANTOM DRIVER\n');

let removed = false;
if (appJson.drivers) {
  const before = appJson.drivers.length;
  appJson.drivers = appJson.drivers.filter(driver => {
    if (driver.id === 'motion_sensor_illuminance_battery') {
      console.log(`❌ Removed phantom driver: ${driver.id}`);
      removed = true;
      return false;
    }
    return true;
  });
  
  if (removed) {
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log(`\n✅ Removed motion_sensor_illuminance_battery from app.json`);
    console.log(`Drivers: ${before} → ${appJson.drivers.length}\n`);
  }
}

if (!removed) {
  console.log('⚠️ Driver not found in app.json\n');
}
