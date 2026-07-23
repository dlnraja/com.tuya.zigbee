// tools/ci/check-collision-safety.js
// P83.2 - Compare against LAST KNOWN state (pre-current-changes)
// Uses git to compute Sacred Couples at HEAD and at HEAD~1, then diffs

'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

function loadDriversAtRef(ref, root) {
  const drivers = new Map();
  const GIT = 'C:\\Program Files\\Git\\cmd\\git.exe';
  let driverDirs;
  try {
    driverDirs = execSync(`"${GIT}" -C "${root}" ls-tree -r --name-only ${ref} -- drivers`, { encoding: 'utf8' });
  } catch (e) {
    return null;
  }
  for (const rel of driverDirs.split('\n').filter(Boolean)) {
    if (!rel.endsWith('driver.compose.json')) continue;
    try {
      const content = execSync(`"${GIT}" -C "${root}" show ${ref}:${rel}`, { encoding: 'utf8' });
      const c = JSON.parse(content);
      if (c.zigbee) {
        const parts = rel.split('/');
        const driverId = parts[1];
        drivers.set(driverId, {
          mfrs: new Set((c.zigbee.manufacturerName || []).map(m => String(m))),
          pids: new Set((c.zigbee.productId || []).map(p => String(p)))
        });
      }
    } catch (e) {}
  }
  return drivers;
}

function loadDriversFromDisk(root) {
  const result = new Map();
  const driversDir = path.join(root, 'drivers');
  for (const d of fs.readdirSync(driversDir)) {
    const p = path.join(driversDir, d, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (c.zigbee) {
        result.set(d, {
          mfrs: new Set((c.zigbee.manufacturerName || []).map(m => String(m))),
          pids: new Set((c.zigbee.productId || []).map(p => String(p)))
        });
      }
    } catch (e) {}
  }
  return result;
}

function computeSacredCouples(drivers) {
  const mfrToDrivers = new Map();
  for (const [d, info] of drivers) {
    for (const m of info.mfrs) {
      if (!mfrToDrivers.has(m)) mfrToDrivers.set(m, new Set());
      mfrToDrivers.get(m).add(d);
    }
  }
  const sc = new Set();
  for (const [m, ds] of mfrToDrivers) {
    if (ds.size > 1) sc.add(m + '|' + [...ds].sort().join(','));
  }
  return sc;
}

console.log('═══ P83.2 — Collision Safety Check (vs HEAD) ═══');

const currentDrivers = loadDriversFromDisk(ROOT);
const currentSC = computeSacredCouples(currentDrivers);
console.log('Current Sacred Couples (working tree):', currentSC.size);

// Try HEAD~1
let previousSC;
try {
  const prevDrivers = loadDriversAtRef('HEAD~1', ROOT);
  if (prevDrivers) {
    previousSC = computeSacredCouples(prevDrivers);
    console.log('Previous Sacred Couples (HEAD~1):', previousSC.size);
  }
} catch (e) {
  console.log('Cannot compare to HEAD~1 (', e.message, ')');
}

if (previousSC) {
  const newCollisions = [...currentSC].filter(c => !previousSC.has(c));
  const fixedCollisions = [...previousSC].filter(c => !currentSC.has(c));
  console.log('');
  console.log('New collisions (caused by working tree changes):', newCollisions.length);
  console.log('Fixed collisions (resolved by working tree changes):', fixedCollisions.length);

  if (newCollisions.length > 0) {
    console.log('');
    console.log('Sample new Sacred Couples:');
    for (const c of newCollisions.slice(0, 10)) console.log('  ' + c);
    console.log('');
    console.log('FAIL: ' + newCollisions.length + ' new Sacred Couples detected');
    process.exit(1);
  } else {
    console.log('');
    console.log('PASS: No new Sacred Couples introduced by working tree changes');
  }
}
