#!/usr/bin/env node
/**
 * dedup-duplicate-mfrs.js (P58.11)
 * ==========================================================================
 * Find and dedup 211 duplicate manufacturerNames in driver.compose.json.
 * The Homey app uses the FIRST driver that has a mfr - duplicates cause
 * "first match wins" confusion and inflate the Zigbee matrix by ~500 combos.
 *
 * Strategy (in priority order):
 *   1. CASE: Merge HOBEIAN/hobeian, SONOFF/sonoff (case-insensitive)
 *   2. PLACEHOLDER: _TZE200_dummy / _TZE200_placeholder - keep only in
 *      their specific "catch-all" driver
 *   3. LIGHT BULBS: _TZ3210_xxx and _tz3000_xxx mfrs in multiple light drivers
 *      (bulb_dimmable, light_bulb_dimmable_tunable, light_bulb_rgb_rgbw)
 *      - keep in the most general (bulb_dimmable)
 *   4. LED: same pattern for led_* drivers
 *   5. OTHER: leave to manual review (each requires domain knowledge)
 *
 * Run modes:
 *   --dry-run    Show what would change without modifying (default)
 *   --apply      Apply changes in place
 *   --json       Output as JSON
 *
 * Run:  node tools/ci/dedup-duplicate-mfrs.js [--apply] [--json]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const JSON_MODE = args.has('--json');

/**
 * Categorize a duplicate mfr. Returns one of:
 *   - 'case_diff' (HOBEIAN vs hobeian)
 *   - 'placeholder' (_TZE200_dummy, _TZE200_placeholder)
 *   - 'light_bulb' (3+ light drivers)
 *   - 'led_controller' (3+ led drivers)
 *   - 'other'
 */
function categorize(mfr, drivers) {
  // Case diff: known manufacturers with mixed-case duplicates
  const knownCaseDupes = ['HOBEIAN', 'hobeian', 'SONOFF', 'sonoff'];
  if (knownCaseDupes.includes(mfr)) {
    return 'case_diff';
  }
  if (mfr.includes('dummy') || mfr.includes('placeholder')) {
    return 'placeholder';
  }
  // Light bulb drivers
  const lightDrivers = ['bulb_dimmable', 'light_bulb_dimmable_tunable', 'light_bulb_rgb_rgbw', 'bulb_rgbw'];
  if (drivers.some(d => lightDrivers.includes(d))) {
    return 'light_bulb';
  }
  // LED drivers
  if (drivers.filter(d => d.startsWith('led_') || d.startsWith('rgb_')).length >= 2) {
    return 'led_controller';
  }
  return 'other';
}

/**
 * Decide which driver should KEEP a mfr (the rest get it removed).
 * Returns the driver name to KEEP, or null if no clear preference.
 */
function pickKeepDriver(mfr, drivers) {
  // Placeholder: keep only in the matching placeholder driver
  if (mfr.includes('placeholder')) {
    const match = drivers.find(d => d.includes('placeholder') || d === 'temphumidsensor5' || d === 'switch_2_gang' || d === 'flood_sensor' || d === 'wall_switch_5_gang_tuya' || d === 'device_air_purifier_climate');
    return match || drivers[0];
  }
  if (mfr.includes('dummy')) {
    // Prefer universal_fallback explicitly first
    if (drivers.includes('universal_fallback')) return 'universal_fallback';
    const match = drivers.find(d => d.includes('fallback') || d === 'device_air_purifier_radiator' || d === 'dimmable_recessed_led' || d === 'outdoor_plug' || d === 'relay_board_4_channel' || d === 'switch_usb_dongle' || d === 'valvecontroller');
    return match || drivers[0];
  }
  // Light bulb: prefer bulb_dimmable (most general)
  if (drivers.includes('bulb_dimmable')) return 'bulb_dimmable';
  // LED: prefer led_controller_dimmable
  if (drivers.includes('led_controller_dimmable')) return 'led_controller_dimmable';
  // Default: keep first
  return drivers[0];
}

function main() {
  // 1. Collect mfrs per driver
  const mfrsByDriver = {}; // mfr -> [drivers]
  const driverMfrs = {};   // driver -> [mfrs]
  const drivers = fs.readdirSync(path.join(ROOT, 'drivers'))
    .filter(d => fs.statSync(path.join(ROOT, 'drivers', d)).isDirectory());
  for (const d of drivers) {
    const p = path.join(ROOT, 'drivers', d, 'driver.compose.json');
    if (!fs.existsSync(p)) continue;
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (c.zigbee?.manufacturerName) {
      driverMfrs[d] = c.zigbee.manufacturerName;
      for (const m of c.zigbee.manufacturerName) {
        if (!mfrsByDriver[m]) mfrsByDriver[m] = [];
        if (!mfrsByDriver[m].includes(d)) mfrsByDriver[m].push(d);
      }
    }
  }

  // 2. Find duplicates
  const dups = Object.entries(mfrsByDriver).filter(([k, v]) => v.length > 1);

  // 3. Categorize + decide
  const plan = [];
  for (const [mfr, ds] of dups) {
    const cat = categorize(mfr, ds);
    if (cat === 'other' || cat === 'case_diff') {
      plan.push({ mfr, drivers: ds, action: 'review', category: cat });
      continue;
    }
    const keep = pickKeepDriver(mfr, ds);
    const remove = ds.filter(d => d !== keep);
    plan.push({ mfr, drivers: ds, keep, remove, action: 'dedup', category: cat });
  }

  // 4. Apply
  let modified = 0;
  for (const p of plan) {
    if (p.action !== 'dedup') continue;
    for (const d of p.remove) {
      const path2 = path.join(ROOT, 'drivers', d, 'driver.compose.json');
      const c = JSON.parse(fs.readFileSync(path2, 'utf8'));
      const before = c.zigbee.manufacturerName.length;
      c.zigbee.manufacturerName = c.zigbee.manufacturerName.filter(m => m !== p.mfr);
      const after = c.zigbee.manufacturerName.length;
      if (before !== after) {
        if (APPLY) {
          fs.writeFileSync(path2, JSON.stringify(c, null, 2) + '\n');
        }
        modified++;
        p.applied = (p.applied || 0) + 1;
      }
    }
  }

  // 5. Report
  if (JSON_MODE) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    const dedupPlans = plan.filter(p => p.action === 'dedup');
    const reviewPlans = plan.filter(p => p.action === 'review');
    console.log('=== Dedup plan (P58.11) ===');
    console.log('Total duplicates:', plan.length);
    console.log('Auto-dedup:', dedupPlans.length, 'mfrs', `(${modified} driver entries will be removed)`);
    console.log('Manual review:', reviewPlans.length, 'mfrs');
    console.log();
    if (!APPLY) {
      console.log('Dry-run: pass --apply to write changes');
    } else {
      console.log(`Applied: ${modified} mfr entries removed from driver.compose.json files`);
    }
  }
}

if (require.main === module) main();
module.exports = { categorize, pickKeepDriver };
