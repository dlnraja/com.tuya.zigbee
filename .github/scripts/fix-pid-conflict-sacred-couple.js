#!/usr/bin/env node
/**
 * fix-pid-conflict-sacred-couple.js
 *
 * Applies Sacred Couple fix for the 1 REAL PID conflict in master.
 *
 * TS0201: air_purifier (class: fan, has measure_pm25) ↔ climate_sensor (class: sensor)
 * Overlapping mfrs (10): _tze200_6wi2mope, _tze200_upagmta9, _tze204_c2fmom5z,
 *                       _tze204_qyflbnbj, _tze204_yvx5lh6k, _tze284_9yapgbuv,
 *                       _tze284_qyflbnbj, _tze284_upagmta9, _tze284_utkemkbs,
 *                       _tze284_yjjdcqsq
 *
 * These are Tuya air quality monitors (PM2.5 + temp/humidity).
 * The air_purifier driver has BOTH measure_pm25 (most specific) AND inherits
 * temperature/humidity via the FAN class. So it's the more specific match.
 *
 * Fix: remove these 10 mfrs from climate_sensor (keep them in air_purifier).
 *
 * Usage:
 *   node .github/scripts/fix-pid-conflict-sacred-couple.js
 *   node .github/scripts/fix-pid-conflict-sacred-couple.js --apply
 *   node .github/scripts/fix-pid-conflict-sacred-couple.js --revert
 *
 * @author Mavis investigation 2026-07-12
 * @version 1.0.0
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS = path.join(ROOT, 'drivers');

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

const REAL_CONFLICT = {
  pid: 'TS0201',
  sourceDriver: 'air_purifier',  // Keep mfrs here
  targetDriver: 'climate_sensor',  // Remove mfrs from here
  sharedMfrs: [
    '_TZE200_6wi2mope',
    '_TZE200_upagmta9',
    '_TZE204_c2fmom5z',
    '_TZE204_qyflbnbj',
    '_TZE204_yvx5lh6k',
    '_TZE284_9yapgbuv',
    '_TZE284_qyflbnbj',
    '_TZE284_upagmta9',
    '_TZE284_utkemkbs',
    '_TZE284_yjjdcqsq',
  ],
};

const NOTE_KEY = '_sacredCoupleFixes';
const NOTE = '// FIX-PID-SACRED-COUPLE: 2026-07-12 — removed 10 TS0201 overlapping mfrs (kept in air_purifier which has measure_pm25)';

function normalizeMfr(m) {
  return m.toLowerCase();
}

function fixDriver(driverId, mfrsToRemove) {
  const cf = path.join(DRIVERS, driverId, 'driver.compose.json');
  if (!fs.existsSync(cf)) return { status: 'skipped', reason: 'not found' };

  const j = JSON.parse(fs.readFileSync(cf, 'utf8'));
  if (!j.zigbee || !Array.isArray(j.zigbee.manufacturerName)) {
    return { status: 'skipped', reason: 'no manufacturerName' };
  }

  const before = j.zigbee.manufacturerName.length;
  const removeSet = new Set(mfrsToRemove.map(normalizeMfr));
  const removed = [];
  const kept = [];
  for (const m of j.zigbee.manufacturerName) {
    if (removeSet.has(normalizeMfr(m))) {
      removed.push(m);
    } else {
      kept.push(m);
    }
  }

  if (REVERT) {
    // Revert: add back
    j.zigbee.manufacturerName = [...kept, ...removed];
    j[NOTE_KEY] = (j[NOTE_KEY] || []).filter((n) => n !== NOTE);
  } else {
    j.zigbee.manufacturerName = kept;
    j[NOTE_KEY] = j[NOTE_KEY] || [];
    if (!j[NOTE_KEY].includes(NOTE)) j[NOTE_KEY].push(NOTE);
  }

  if (APPLY) {
    fs.writeFileSync(cf, JSON.stringify(j, null, 2), 'utf8');
  }

  return {
    status: removed.length > 0 ? 'fixed' : 'no-change',
    before,
    after: j.zigbee.manufacturerName.length,
    removed: removed.length,
  };
}

function main() {
  console.log(`Sacred Couple Fix v1.0.0 — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}${REVERT ? ' (REVERT)' : ''}\n`);
  console.log(`Conflict: PID=${REAL_CONFLICT.pid}`);
  console.log(`  Source: ${REAL_CONFLICT.sourceDriver} (KEPS mfrs — more specific)`);
  console.log(`  Target: ${REAL_CONFLICT.targetDriver} (REMOVES mfrs)\n`);

  const result = fixDriver(REAL_CONFLICT.targetDriver, REAL_CONFLICT.sharedMfrs);
  console.log(`Target driver (${REAL_CONFLICT.targetDriver}):`);
  console.log(`  status: ${result.status}`);
  if (result.before !== undefined) {
    console.log(`  mfrs: ${result.before} → ${result.after} (removed ${result.removed})`);
  }
  if (result.reason) console.log(`  reason: ${result.reason}`);

  // Verify source driver still has all 10
  const sourceCf = path.join(DRIVERS, REAL_CONFLICT.sourceDriver, 'driver.compose.json');
  if (fs.existsSync(sourceCf)) {
    const src = JSON.parse(fs.readFileSync(sourceCf, 'utf8'));
    const srcMfrs = (src.zigbee?.manufacturerName || []).map(normalizeMfr);
    const stillHas = REAL_CONFLICT.sharedMfrs.filter((m) => srcMfrs.includes(normalizeMfr(m)));
    console.log(`\nSource driver (${REAL_CONFLICT.sourceDriver}):`);
    console.log(`  mfrs total: ${src.zigbee?.manufacturerName?.length || 0}`);
    console.log(`  of 10 shared mfrs, still has: ${stillHas.length}/10`);
  }

  if (!APPLY) {
    console.log('\n  Run with --apply to actually modify files.');
  }
}

main();
