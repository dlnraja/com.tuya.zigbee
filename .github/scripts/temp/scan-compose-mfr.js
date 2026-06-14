// @Deprecated 2026-06-13 - One-time investigation script. Superseded by inline checks in CI workflows.
'use strict';
const fs = require('fs');
const path = require('path');

const driversDir = 'c:/Users/HP/Desktop/homey-app/tuya_repair/drivers';
const drivers = fs.readdirSync(driversDir);
const badDrivers = [];

for (const drv of drivers) {
  const composePath = path.join(driversDir, drv, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (compose.zigbee) {
        const mfr = compose.zigbee.manufacturerName;
        if (!mfr || (Array.isArray(mfr) && mfr.length === 0)) {
          badDrivers.push(drv);
        }
      }
    } catch (e) {
      console.error(`Error parsing ${composePath}:`, e.message);
    }
  }
}

console.log('Drivers with empty/missing manufacturerName in driver.compose.json:', badDrivers);
console.log('Count:', badDrivers.length);
