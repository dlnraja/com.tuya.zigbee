#!/usr/bin/env node
'use strict';

/**
 * re-inject-manual-fixes.js — v9.0.262 (P63.3)
 *
 * The auto-publish bot (github-actions[bot]) regenerates `app.json` and
 * `drivers/<name>/driver.compose.json` from canonical templates. Manual
 * fingerprint edits (e.g. HOBEIAN added in P61) are often silently dropped
 * by these regenerations.
 *
 * This script re-applies the manual fixes AFTER the bot regeneration. Wire
 * it into the auto-fix-and-publish.yml workflow as a post-build hook:
 *
 *   - name: "🔁 Re-inject manual driver fixes (P63.3)"
 *     run: node tools/ci/re-inject-manual-fixes.js
 *
 * The fixes are listed in MANUAL_FIXES below. Each entry has:
 *   - file: relative path to the file to patch
 *   - match: function (content) => array of fingerprints that should be present
 *   - addIfMissing: list of fingerprints to ensure are in the file
 *   - source: tag (e.g. 'p61-fix', 'p63.2') for traceability
 *
 * The script is idempotent — running it twice has no effect on the second run.
 *
 * Why this exists (P63.3):
 *   The 2026-07-15 audit (forum #2108 + master history) found that the
 *   v9.0.252 auto-publish bot reverted the HOBEIAN P61 fix in
 *   `drivers/sensor_contact_zigbee/driver.compose.json` while adding it
 *   back to the compiled `app.json` — inconsistent state. The compiled
 *   manifest is what users actually run, so functionality was preserved,
 *   but the source-of-truth was broken and any future regeneration from
 *   source would lose the fix permanently.
 *
 *   This script ensures the SOURCE files (driver.compose.json) always
 *   have the manual fixes, so the next regeneration includes them.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const MANUAL_FIXES = [
  {
    id: 'p61-hobeian-sensor-contact-zigbee',
    file: 'drivers/sensor_contact_zigbee/driver.compose.json',
    description: 'Peter #2108: HOBEIAN door/window sensor',
    match: (mfrs) => ['HOBEIAN', 'hobeian', 'Hobeian'].some(x => mfrs.includes(x)),
    addIfMissing: ['HOBEIAN', 'hobeian', 'Hobeian'],
    addAtTop: true,
    source: 'p61-fix',
  },
  {
    id: 'p61-hobeian-water-leak-sensor',
    file: 'drivers/water_leak_sensor/driver.compose.json',
    description: 'Peter #2090: HOBEIAN ZG-222Z water detector — DISABLED in P74 (collision with sensor_contact_zigbee)',
    match: (mfrs) => false, // P74: HOBEIAN | TS0601 collides with sensor_contact_zigbee (Hobeian ZG-301Z door sensor)
    addIfMissing: [],
    addAtTop: false,
    source: 'p74-disabled',
  },
  // P75.18-22: Forum-routing test mfrs (must be in driver, not just switch_1gang catch-all)
  {
    id: 'p75.18-button-wireless-4-mfrs',
    file: 'drivers/button_wireless_4/driver.compose.json',
    description: 'P75.18-22: Forum-routing test mfrs (auto-fix-all reverts these)',
    match: (mfrs) => mfrs.includes('_TZ3000_kfu8zapd'),
    addIfMissing: [
      '_TZ3000_u3nv1jwk',
      '_TZ3000_kfu8zapd',
      '_TZ3000_xabckq1v',
      '_TZ3000_czuyt8lz',
      '_TZ3000_b3mgfu0d',
      '_TZ3000_rco1yzb1',
      '_TZ3000_abrsvsou',
      '_TZ3000_4fjiwweb',
    ],
    addAtTop: false,
    source: 'p75.18-forum-routing',
  },
  {
    id: 'p75.18-smart-knob-rotary-mfrs',
    file: 'drivers/smart_knob_rotary/driver.compose.json',
    description: 'P75.18-22: Smart knob rotary mfrs (Moes/Lidl TS004F)',
    match: (mfrs) => mfrs.includes('_TZ3000_qja6nq5z'),
    addIfMissing: ['_TZ3000_qja6nq5z', '_TZ3000_gwkzibhs', '_TZ3000_ugi8ky6u'],
    addAtTop: false,
    source: 'p75.18-forum-routing',
  },
  {
    id: 'p75.18-switch-3gang-mfrs',
    file: 'drivers/switch_3gang/driver.compose.json',
    description: 'P75.18-22: 3-gang switch mfrs',
    match: (mfrs) => mfrs.includes('_TZ3000_eqsair32'),
    addIfMissing: ['_TZ3000_eqsair32', '_TZ3000_qxcnwv26'],
    addAtTop: false,
    source: 'p75.18-forum-routing',
  },
  {
    id: 'p75.18-wall-switch-4gang-1way-mfrs',
    file: 'drivers/wall_switch_4gang_1way/driver.compose.json',
    description: 'P75.18-22: 4-gang wall switch mfrs (Moes TS0014)',
    match: (mfrs) => mfrs.includes('_TZ3000_mrduubod'),
    addIfMissing: ['_TZ3000_mrduubod', '_TZ3002_pzao9ls1'],
    addAtTop: false,
    source: 'p75.18-forum-routing',
  },
];

function patchFix(fix) {
  const fp = path.join(ROOT, fix.file);
  if (!fs.existsSync(fp)) {
    console.log(`  ⚠️  ${fix.id}: file not found ${fix.file}`);
    return false;
  }
  const content = fs.readFileSync(fp, 'utf8');
  const j = JSON.parse(content);
  if (!j.zigbee || !Array.isArray(j.zigbee.manufacturerName)) {
    console.log(`  ⚠️  ${fix.id}: no manufacturerName array`);
    return false;
  }
  const mfrs = j.zigbee.manufacturerName;
  if (fix.match(mfrs)) {
    return false; // already has the fix
  }
  // Add missing fingerprints
  let added = 0;
  for (const fp of fix.addIfMissing) {
    if (!mfrs.includes(fp)) {
      if (fix.addAtTop) {
        mfrs.unshift(fp);
      } else {
        mfrs.push(fp);
      }
      added++;
    }
  }
  if (added === 0) return false;
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n');
  console.log(`  ✅ ${fix.id} (${fix.description}): added ${added} FP(s) from source '${fix.source}'`);
  return true;
}

let total = 0;
let applied = 0;
console.log('═══════════════════════════════════════════════');
console.log('  🔁 RE-INJECT MANUAL FIXES (P63.3)');
console.log('═══════════════════════════════════════════════');
for (const fix of MANUAL_FIXES) {
  total++;
  if (patchFix(fix)) applied++;
}
console.log(`\nApplied: ${applied}/${total} manual fixes re-injected`);
process.exit(0);
