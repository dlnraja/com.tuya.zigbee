#!/usr/bin/env node
/**
 * Fix Duplicate Fingerprints in Same Driver
 * v1.0.0 - Fixes false positive collisions (same driver listed twice)
 * 
 * Pattern detected: `_tz3000_yz38gdra|ts0601 → water_valve_smart, water_valve_smart`
 * = Same mfr+pid+driver appearing twice in collision list = duplicate entry in driver.compose.json
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
      const mfrs = [].concat(c.zigbee?.manufacturerName || []);
      const pids = [].concat(c.zigbee?.productId || []);
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
    const mfrs = driver.mfrs;
    const seen = new Map();
    const duplicates = [];
    
    // Find duplicates (case-insensitive for fingerprints)
    mfrs.forEach((mfr, idx) => {
      if (!mfr) return;
      const lower = mfr.toLowerCase();
      if (seen.has(lower)) {
        duplicates.push({ idx, mfr, existingIdx: seen.get(lower) });
      } else {
        seen.set(lower, idx);
      }
    });

    if (duplicates.length > 0) {
      console.log(`\n${driver.name}: ${duplicates.length} duplicate(s) found`);
      duplicates.forEach(d => {
        console.log(`  - "${d.mfr}" (index ${d.idx}) duplicates index ${d.existingIdx}`);
      });

      // Remove duplicates (keep first occurrence)
      const unique = [];
      const seenLower = new Set();
      mfrs.forEach((mfr, idx) => {
        if (!mfr) return;
        const lower = mfr.toLowerCase();
        if (!seenLower.has(lower)) {
          unique.push(mfr);
          seenLower.add(lower);
        }
      });

      // Update content
      driver.content.zigbee.manufacturerName = unique;
      const removed = mfrs.length - unique.length;
      totalRemoved += removed;
      driversModified++;

      console.log(`  Removed ${removed} duplicate(s), keeping ${unique.length}`);
    }
  }

  return { totalRemoved, driversModified };
}

function main() {
  console.log('=== Fix Duplicate Fingerprints ===\n');

  const drivers = loadDrivers();
  console.log(`Loaded ${drivers.length} drivers\n`);

  // Phase 1: Deduplicate manufacturerNames in same driver
  console.log('--- Phase 1: Deduplicate manufacturerNames ---');
  const result1 = deduplicateMfrs(drivers);
  console.log(`\n✅ Removed ${result1.totalRemoved} duplicates from ${result1.driversModified} drivers`);

  // Phase 2: Save changes
  if (result1.driversModified > 0) {
    console.log('\n--- Phase 2: Saving changes ---');
    let saved = 0;
    for (const driver of drivers) {
      if (driver.content.zigbee && driver.content.zigbee.manufacturerName && driver.content.zigbee.manufacturerName.length !== driver.mfrs.length) {
        fs.writeFileSync(driver.file, JSON.stringify(driver.content, null, 2) + '\n');
        saved++;
        console.log(`  💾 Saved ${driver.name}`);
      }
    }
    console.log(`\n✅ Saved ${saved} driver.compose.json files`);
  }

  // Phase 3: Verify with lint-collisions
  console.log('\n--- Phase 3: Verification ---');
  console.log('Run: node scripts/automation/lint-collisions.js');
  console.log('Expected: 0 collisions after fix');

  console.log('\n=== FIX COMPLETE ===');
}

main();
