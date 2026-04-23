#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const HYBRID_DRIVERS_TO_CLEAN = [
  'air_purifier_climate_hybrid',
  'device_plug_energy_monitor_hybrid',
  'air_purifier_sensor_hybrid',
  'air_purifier_din_hybrid',
  'device_air_purifier_din_hybrid'
];

async function main() {
  console.log(' Deduplicating Hybrid Fingerprints...');
  
  // 1. Build a map of "Specific" fingerprints
  const specificFps = new Map(); // "mfr|pid" -> driverId
  
  const drivers = fs.readdirSync(DRIVERS_DIR);
  for (const d of drivers) {
    if (HYBRID_DRIVERS_TO_CLEAN.includes(d)) continue;
    const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const mfrs = compose.zigbee?.manufacturerName || []      ;
    const pids = compose.zigbee?.productId || []      ;
    
    for (const mfr of mfrs) {
      for (const pid of (pids.length ? pids : ['*'])) {
        specificFps.set(`${mfr.toUpperCase()}|${pid.toUpperCase()}`, d);
      }
    }
  }

  // 2. Clean up Hybrid drivers
  for (const hybrid of HYBRID_DRIVERS_TO_CLEAN) {
    const composePath = path.join(DRIVERS_DIR, hybrid, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    let changed = false;
    
    if (compose.zigbee) {
      const oldMfrs = compose.zigbee.manufacturerName || [];
      const newMfrs = oldMfrs.filter(mfr => {
        // If this manufacturer is used by a specific driver with NO specific PID, remove from hybrid
        const key = `${mfr.toUpperCase()}|*`;
        if (specificFps.has(key)) {
           console.log(`  [-] Removing ${mfr} from ${hybrid} (handled by ${specificFps.get(key)})`);
           return false;
        }
        return true;
      });
      
      if (newMfrs.length !== oldMfrs.length) {
        compose.zigbee.manufacturerName = newMfrs;
        changed = true;
      }
    }
    
    if (changed) {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
    }
  }
  
  console.log(' Deduplication complete.');
}

main().catch(console.error);
