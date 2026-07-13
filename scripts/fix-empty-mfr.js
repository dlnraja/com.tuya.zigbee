'use strict';
const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

if (!fs.existsSync(DRIVERS_DIR)) {
  console.error('Drivers directory does not exist!');
  process.exit(1);
}

const drivers = fs.readdirSync(DRIVERS_DIR);
let fixedCount = 0;

for (const driver of drivers) {
  const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      const raw = fs.readFileSync(composePath, 'utf8');
      const data = JSON.parse(raw);
      
      if (data.zigbee) {
        if (!data.zigbee.manufacturerName) {
          data.zigbee.manufacturerName = ["_TZ3000_unknown"];
          fixedCount++;
          console.log(`[FIXED] Added manufacturerName to ${driver}`);
          fs.writeFileSync(composePath, JSON.stringify(data, null, 2), 'utf8');
        } else if (Array.isArray(data.zigbee.manufacturerName) && data.zigbee.manufacturerName.length === 0) {
          data.zigbee.manufacturerName = ["_TZ3000_unknown"];
          fixedCount++;
          console.log(`[FIXED] Populated empty manufacturerName for ${driver}`);
          fs.writeFileSync(composePath, JSON.stringify(data, null, 2), 'utf8');
        }
      }
    } catch (err) {
      console.error(`Error parsing ${composePath}:`, err.message);
    }
  }
}

console.log(`\nSuccessfully fixed ${fixedCount} driver.compose.json files.`);
