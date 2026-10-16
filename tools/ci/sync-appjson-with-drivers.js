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

function sameList(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

for (const appD of app.drivers) {
  const driverId = appD.id;
  const capPath = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(capPath)) continue;
  const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'));
  const drvMfrs = cap.zigbee?.manufacturerName || [];
  const drvPids = cap.zigbee?.productId || [];
  const appMfrs = appD.zigbee?.manufacturerName || [];
  const appPids = appD.zigbee?.productId || [];
  // WHY(P2842d): compose is pairing SSOT — mirror exact lists into app.json (add + prune)
  const mfrDrift = !sameList(appMfrs, drvMfrs);
  const pidDrift = !sameList(appPids, drvPids);
  if (mfrDrift || pidDrift) {
    changes.push({
      driverId,
      mfrDrift,
      pidDrift,
      missingMfrs: drvMfrs.filter((m) => !appMfrs.includes(m)),
      extraMfrs: appMfrs.filter((m) => !drvMfrs.includes(m)),
      missingPids: drvPids.filter((p) => !appPids.includes(p)),
      extraPids: appPids.filter((p) => !drvPids.includes(p)),
      drvMfrs,
      drvPids,
    });
    fixed++;
  }
}

console.log('=== app.json vs driver.compose.json sync ===');
console.log('Drivers needing sync:', fixed);
if (process.argv.includes('--apply')) {
  for (const c of changes) {
    const appD = app.drivers.find((x) => x.id === c.driverId);
    if (!appD.zigbee) appD.zigbee = {};
    if (c.mfrDrift) {
      appD.zigbee.manufacturerName = c.drvMfrs.slice();
      console.log(
        `  ${c.driverId}: mfr mirror (+${c.missingMfrs.length}/-${c.extraMfrs.length})`,
      );
    }
    if (c.pidDrift) {
      appD.zigbee.productId = c.drvPids.slice();
      console.log(
        `  ${c.driverId}: pid mirror (+${c.missingPids.length}/-${c.extraPids.length})`,
      );
    }
  }
  // Compact on CI/publish paths; pretty local is fine — keep one-line JSON for size gates
  fs.writeFileSync(APP_JSON, `${JSON.stringify(app)}\n`);
  console.log('Applied:', fixed, 'drivers updated (compose→app mirror)');
} else {
  console.log('Dry run. Use --apply to write app.json.');
  if (fixed > 0) {
    console.log('First 10:');
    changes.slice(0, 10).forEach((c) => {
      console.log(
        `  ${c.driverId}: +${c.missingMfrs.length}/-${c.extraMfrs.length} mfrs, +${c.missingPids.length}/-${c.extraPids.length} pids`,
      );
    });
  }
}
