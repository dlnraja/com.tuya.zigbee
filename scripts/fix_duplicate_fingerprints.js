#!/usr/bin/env node
/**
 * Fix Duplicate Fingerprints in driver.compose.json
 *
 * Problem: Many manufacturerName entries appear 2-3 times in the same driver,
 * causing multiple device matches and creating duplicate Homey devices.
 *
 * Solution: Remove duplicate entries from manufacturerName arrays and
 * deduplicate zigbee.devices entries.
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

// Get all driver directories
const drivers = fs.readdirSync(driversDir).filter(d => {
  const stat = fs.statSync(path.join(driversDir, d));
  return stat.isDirectory();
});

let totalFixed = 0;
let totalDuplicatesRemoved = 0;

console.log('🔧 Fixing duplicate fingerprints in driver.compose.json files...\n');

for (const driver of drivers) {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');

  if (!fs.existsSync(composePath)) {
    continue;
  }

  try {
    const content = fs.readFileSync(composePath, 'utf8');
    const json = JSON.parse(content);

    let driverFixed = false;
    let driverDuplicates = 0;

    // Fix 1: Deduplicate manufacturerName array in zigbee root
    if (json.zigbee?.manufacturerName && Array.isArray(json.zigbee.manufacturerName)) {
      const original = json.zigbee.manufacturerName.length;
      // Use case-insensitive deduplication
      const seen = new Set();
      json.zigbee.manufacturerName = json.zigbee.manufacturerName.filter(name => {
        const key = name.toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      const removed = original - json.zigbee.manufacturerName.length;
      if (removed > 0) {
        driverDuplicates += removed;
        driverFixed = true;
      }
    }

    // Fix 2: Deduplicate zigbee.devices array
    if (json.zigbee?.devices && Array.isArray(json.zigbee.devices)) {
      const original = json.zigbee.devices.length;
      const seen = new Set();
      json.zigbee.devices = json.zigbee.devices.filter(device => {
        // Create unique key from manufacturerName + modelId
        const mfr = (device.manufacturerName || '').toLowerCase();
        const model = (device.modelId || '').toLowerCase();
        const key = `${mfr}:${model}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      const removed = original - json.zigbee.devices.length;
      if (removed > 0) {
        driverDuplicates += removed;
        driverFixed = true;
      }
    }

    // Fix 3: Normalize case for Tuya manufacturerNames (should be uppercase TZE)
    if (json.zigbee?.manufacturerName && Array.isArray(json.zigbee.manufacturerName)) {
      json.zigbee.manufacturerName = json.zigbee.manufacturerName.map(name => {
        // Fix _TZe to _TZE
        return name.replace(/^_TZe(\d{3}_)/i, '_TZE$1');
      });
    }

    if (json.zigbee?.devices && Array.isArray(json.zigbee.devices)) {
      json.zigbee.devices = json.zigbee.devices.map(device => {
        if (device.manufacturerName) {
          device.manufacturerName = device.manufacturerName.replace(/^_TZe(\d{3}_)/i, '_TZE$1');
        }
        return device;
      });
    }

    if (driverFixed) {
      // Write back
      fs.writeFileSync(composePath, JSON.stringify(json, null, 2) + '\n');
      console.log(`✅ ${driver}: Removed ${driverDuplicates} duplicates`);
      totalFixed++;
      totalDuplicatesRemoved += driverDuplicates;
    }
  } catch (err) {
    console.log(`❌ ${driver}: Error - ${err.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ Drivers fixed: ${totalFixed}`);
console.log(`🗑️ Total duplicates removed: ${totalDuplicatesRemoved}`);
console.log(`📊 Total drivers scanned: ${drivers.length}`);
console.log('='.repeat(60));
