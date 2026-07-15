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
    description: 'Peter #2090: HOBEIAN ZG-222Z water detector',
    match: (mfrs) => ['HOBEIAN', 'hobeian', 'Hobeian'].some(x => mfrs.includes(x)),
    addIfMissing: ['HOBEIAN', 'hobeian', 'Hobeian'],
    addAtTop: true,
    source: 'p61-fix',
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
