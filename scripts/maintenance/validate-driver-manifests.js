#!/usr/bin/env node
'use strict';
/**
 * Validate Driver Manifests - Checks driver.compose.json consistency
 * Ensures all drivers referenced in app.json have valid compose files
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const driversDir = path.join(root, 'drivers');

let errors = 0;
let checked = 0;

for (const driver of (appJson.drivers || [])) {
  checked++;
  const driverDir = path.join(driversDir, driver.id);
  const composePath = path.join(driverDir, 'driver.compose.json');
  
  if (!fs.existsSync(driverDir)) {
    console.error(`❌ Missing driver directory: ${driver.id}`);
    errors++;
    continue;
  }
  
  if (!fs.existsSync(composePath)) {
    console.error(`❌ Missing driver.compose.json: ${driver.id}`);
    errors++;
    continue;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const mfrs = compose.zigbee?.manufacturerName || [];
    const pids = compose.zigbee?.productId || [];
    
    if (mfrs.length === 0 && pids.length === 0) {
      // WiFi drivers may not have zigbee section
      if (!compose.tuya && !compose.ewelink) {
        console.warn(`⚠️ No fingerprints: ${driver.id}`);
      }
    }
  } catch (e) {
    console.error(`❌ Invalid JSON: ${composePath}: ${e.message}`);
    errors++;
  }
}

console.log(`\n✅ Validated ${checked} drivers, ${errors} errors`);
if (errors > 0) process.exit(1);