#!/usr/bin/env node
/**
 * CI Collision Resolver - Resolves fingerprint collisions for CI
 * Run: node scripts/ci/resolve-collisions.js [--dry-run] [--json]
 *
 * Reads driver compose files, detects manufacturer+productId collisions,
 * and resolves them by removing the conflicting entry from the less
 * specific driver.
 *
 * Exit codes: 0 = resolved, 1 = unresolved collisions, 2 = script failure
 */
'use strict';

const fs = require('fs');
const path = require('path');

const JSON_OUTPUT = process.argv.includes('--json');
const DRY_RUN = process.argv.includes('--dry-run');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function getCompose(driver) {
  const p = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    if (!JSON_OUTPUT) console.error(`Error parsing ${p}: ${e.message}`);
    return null;
  }
}

function saveCompose(driver, data) {
  const p = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

// Read all drivers and build FP map
const fpMap = new Map();
const driverDirs = fs.readdirSync(DRIVERS_DIR).filter(d => {
  try { return fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory(); }
  catch { return false; }
});

const driverCount = driverDirs.length;
const allChanges = [];

for (const dir of driverDirs) {
  const comp = getCompose(dir);
  if (!comp || !comp.zigbee || !comp.zigbee.manufacturerName || !comp.zigbee.productId) continue;

  for (const mfr of comp.zigbee.manufacturerName) {
    for (const pid of comp.zigbee.productId) {
      const key = `${mfr.toLowerCase()}|${pid}`;
      if (!fpMap.has(key)) fpMap.set(key, []);
      fpMap.get(key).push({ driver: dir, mfr, pid });
    }
  }
}

// Determine which driver to remove from
const PRIMARY_DRIVERS = [
  'switch_2gang', 'button_wireless_plug', 'button_wireless_2', 'climate_sensor',
  'device_din_rail', 'presence_sensor_radar', 'switch_1gang'
];

let resolved = 0;
let unresolved = 0;

for (const [key, entries] of fpMap) {
  const uniqueDrivers = [...new Set(entries.map(e => e.driver))];
  if (uniqueDrivers.length > 1) {
    const [mfr, pid] = key.split('|');

    // Pick the victim driver (the one NOT in PRIMARY_DRIVERS, or just the last one)
    let victim = uniqueDrivers.find(d => !PRIMARY_DRIVERS.includes(d));
    if (!victim) victim = uniqueDrivers[1]; // fallback

    const change = {
      collisionKey: key,
      drivers: uniqueDrivers,
      victim,
      mfr: entries[0].mfr,
      pid,
    };

    const comp = getCompose(victim);
    if (comp && comp.zigbee && comp.zigbee.manufacturerName) {
      const originalCount = comp.zigbee.manufacturerName.length;
      comp.zigbee.manufacturerName = comp.zigbee.manufacturerName.filter(m => m.toLowerCase() !== mfr.toLowerCase());
      if (comp.zigbee.manufacturerName.length < originalCount) {
        change.removed = true;
        if (!DRY_RUN) {
          saveCompose(victim, comp);
        }
        resolved++;
      } else {
        change.removed = false;
        unresolved++;
      }
    } else {
      change.removed = false;
      change.error = `Could not load compose for ${victim}`;
      unresolved++;
    }

    allChanges.push(change);
  }
}

if (JSON_OUTPUT) {
  const output = {
    timestamp: new Date().toISOString(),
    driversScanned: driverCount,
    collisionsFound: allChanges.length,
    resolved,
    unresolved,
    dryRun: DRY_RUN,
    changes: allChanges,
    exitCode: unresolved > 0 ? 1 : 0,
  };
  console.log(JSON.stringify(output, null, 2));
} else {
  for (const c of allChanges) {
    console.log(`Resolving ${c.mfr}|${c.pid} between ${c.drivers.join(', ')} -> Removing from ${c.victim} ${c.removed ? '(done)' : '(skipped)'}`);
  }
  console.log(`\nDone: ${resolved} resolved, ${unresolved} unresolved, ${driverCount} drivers scanned.`);
  if (DRY_RUN) console.log('(DRY RUN - no files modified)');
}

process.exit(unresolved > 0 ? 1 : 0);
