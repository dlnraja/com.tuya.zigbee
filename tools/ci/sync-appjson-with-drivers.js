#!/usr/bin/env node
/**
 * sync-appjson-with-drivers.js
 * =============================================================================
 * Sync app.json mfrs/pids with the corresponding driver.compose.json files.
 * Useful when auto-fix-all bot drops/transforms entries.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const APP_JSON = path.join(ROOT, 'app.json');

const app = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
let fixed = 0;
const changes = [];

for (const appD of app.drivers) {
  const driverId = appD.id;
  const capPath = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(capPath)) continue;
  const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
  const drvMfrs = cap.zigbee?.manufacturerName || [];
  const drvPids = cap.zigbee?.productId || [];
  const appMfrs = appD.zigbee?.manufacturerName || [];
  const appPids = appD.zigbee?.productId || [];
  const missingMfrs = drvMfrs.filter(m => !appMfrs.includes(m));
  const missingPids = drvPids.filter(p => !appPids.includes(p));
  if (missingMfrs.length > 0 || missingPids.length > 0) {
    changes.push({ driverId, missingMfrs, missingPids });
    fixed++;
  }
}

console.log('=== app.json vs driver.compose.json sync ===');
console.log('Drivers needing sync:', fixed);
if (process.argv.includes('--apply')) {
  for (const { driverId, missingMfrs, missingPids } of changes) {
    const appD = app.drivers.find(x => x.id === driverId);
    if (missingMfrs.length > 0) {
      appD.zigbee.manufacturerName = [...appD.zigbee.manufacturerName, ...missingMfrs];
      console.log(`  ${driverId}: +${missingMfrs.length} mfrs`);
    }
    if (missingPids.length > 0) {
      appD.zigbee.productId = [...appD.zigbee.productId, ...missingPids];
      console.log(`  ${driverId}: +${missingPids.length} pids`);
    }
  }
  fs.writeFileSync(APP_JSON, JSON.stringify(app, null, 2) + '\n');
  console.log('Applied:', fixed, 'drivers updated');
} else {
  console.log('Dry run. Use --apply to write app.json.');
  if (fixed > 0) {
    console.log('First 10:');
    changes.slice(0, 10).forEach(c => {
      console.log(`  ${c.driverId}: +${c.missingMfrs.length} mfrs, +${c.missingPids.length} pids`);
    });
  }
}
