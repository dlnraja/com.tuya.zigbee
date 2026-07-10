#!/usr/bin/env node
/**
 * Fix Duplicate Fingerprints in Same Driver
 * v2.0.0 - Independently deduplicate manufacturerName and productId arrays
 * 
 * Homey uses Cartesian matching (any MFR + any PID). Duplicate entries in either
 * array cause AggregateErrors during build. This script simply makes both arrays
 * contain only unique strings, solving the self-collision and build errors.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DDIR = path.join(process.cwd(), 'drivers');

function loadDrivers() {
  const drivers = [];
  for (const d of fs.readdirSync(DDIR)) {
    const f = path.join(DDIR, d, 'driver.compose.json');
    if (!fs.existsSync(f)) continue;
    try {
      const c = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!c.zigbee) continue;
      const mfrs = [].concat(c.zigbee.manufacturerName || []);
      const pids = [].concat(c.zigbee.productId || []);
      drivers.push({ name: d, mfrs, pids, file: f, content: c });
    } catch(e) {
      console.log(`  ⚠️ Error reading ${d}: ${e.message}`);
    }
  }
  return drivers;
}

function deduplicateMfrs(drivers) {
  let totalRemoved = 0;
  let driversModified = 0;

  for (const driver of drivers) {
    const origMfrs = driver.mfrs;
    const origPids = driver.pids;
    
    // Case-insensitive deduplication, keeping the first capitalization encountered
    const uniqueMfrs = [];
    const seenMfrs = new Set();
    for (const mfr of origMfrs) {
      if (!mfr) continue;
      const lower = mfr.toLowerCase();
      if (!seenMfrs.has(lower)) {
        seenMfrs.add(lower);
        uniqueMfrs.push(mfr);
      }
    }

    const uniquePids = [];
    const seenPids = new Set();
    for (const pid of origPids) {
      if (!pid) continue;
      const lower = pid.toLowerCase();
      if (!seenPids.has(lower)) {
        seenPids.add(lower);
        uniquePids.push(pid);
      }
    }

    const removedMfrs = origMfrs.length - uniqueMfrs.length;
    const removedPids = origPids.length - uniquePids.length;

    if (removedMfrs > 0 || removedPids > 0) {
      console.log(`\n${driver.name}:`);
      if (removedMfrs > 0) console.log(`  - Removed ${removedMfrs} duplicate manufacturerNames`);
      if (removedPids > 0) console.log(`  - Removed ${removedPids} duplicate productIds`);
      
      driver.content.zigbee.manufacturerName = uniqueMfrs;
      driver.content.zigbee.productId = uniquePids;
      
      totalRemoved += (removedMfrs + removedPids);
      driversModified++;
    }
  }

  return { totalRemoved, driversModified };
}

function main() {
  console.log('=== Fix Duplicate Fingerprints ===\n');

  const drivers = loadDrivers();
  console.log(`Loaded ${drivers.length} drivers\n`);

  console.log('--- Phase 1: Deduplicate Arrays ---');
  const result1 = deduplicateMfrs(drivers);
  console.log(`\n✅ Removed ${result1.totalRemoved} duplicate items from ${result1.driversModified} drivers`);

  if (result1.driversModified > 0) {
    console.log('\n--- Phase 2: Saving changes ---');
    let saved = 0;
    for (const driver of drivers) {
      const origMfrs = driver.mfrs;
      const origPids = driver.pids;
      const newMfrs = driver.content.zigbee.manufacturerName;
      const newPids = driver.content.zigbee.productId;
      
      if (origMfrs.length !== newMfrs.length || origPids.length !== newPids.length) {
        fs.writeFileSync(driver.file, JSON.stringify(driver.content, null, 2) + '\n');
        saved++;
        console.log(`  💾 Saved ${driver.name}`);
      }
    }
    console.log(`\n✅ Saved ${saved} driver.compose.json files`);
  }

  console.log('\n--- Phase 3: Verification ---');
  console.log('Run: node scripts/validation/check-driver-collisions.js');
  console.log('Expected: 0 collisions after fix');

  console.log('\n=== FIX COMPLETE ===');
}

main();
