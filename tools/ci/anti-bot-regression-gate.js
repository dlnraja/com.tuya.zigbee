'use strict';

/**
 * tools/ci/anti-bot-regression-gate.js
 *
 * P94+: Fail CI if auto-fix-all / bot reintroduces known wrong Sacred Couple
 * routings. Complements re-inject-manual-fixes.js (repair) with a hard gate
 * (detect). Safe for master + stable.
 *
 * Usage:
 *   node tools/ci/anti-bot-regression-gate.js
 *   node tools/ci/anti-bot-regression-gate.js --root C:/Users/Dell/Documents/homey/stable
 *
 * Exit 0 = clean, Exit 1 = regression detected.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let ROOT = process.cwd();
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--root') ROOT = path.resolve(args[++i]);
}

function loadCompose(driverId) {
  const fp = path.join(ROOT, 'drivers', driverId, 'driver.compose.json');
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

function hasMfr(compose, mfr) {
  const list = (compose && compose.zigbee && compose.zigbee.manufacturerName) || [];
  const target = String(mfr).toLowerCase();
  return list.some((m) => String(m).toLowerCase() === target);
}

function hasPid(compose, pid) {
  const list = (compose && compose.zigbee && compose.zigbee.productId) || [];
  return list.some((p) => String(p).toUpperCase() === String(pid).toUpperCase());
}

/** Forbidden placements: driver must NOT contain these mfrs (case-insensitive). */
const FORBIDDEN = [
  // P90/P93: bot put metering/button mfrs on 4-button remote
  {
    id: 'p93-button4-bot-mfrs',
    driver: 'button_wireless_4',
    mfrs: ['_TZ3000_xabckq1v', '_TZ3000_czuyt8lz', '_TZ3000_b3mgfu0d', '_TZ3000_abrsvsou', '_TZ3000_4fjiwweb'],
  },
  // Forum #2131: relay fingerprint must not stay on switch_4gang
  {
    id: 'p94-imaccztn-not-switch4',
    driver: 'switch_4gang',
    mfrs: ['_TZ3210_imaccztn'],
  },
  // Forum #2133: BSEED dimmer must not be climate sensor
  {
    id: 'p94-m1cvyneb-not-climate',
    driver: 'climate_sensor',
    mfrs: ['_TZE284_m1cvyneb'],
  },
];

/** Forbidden productIds on a driver. */
const FORBIDDEN_PIDS = [
  {
    id: 'p93-zg222z-not-gas',
    driver: 'gas_sensor_switch',
    pids: ['ZG-222Z'],
  },
];

/** Required placements (must be present). */
const REQUIRED = [
  {
    id: 'p93-sacred-switch1',
    driver: 'switch_1gang',
    mfrs: ['_TZ3000_xabckq1v', '_TZ3000_czuyt8lz'],
  },
  {
    id: 'p94-w5xztuy7-switch2',
    driver: 'switch_2gang',
    mfrs: ['_TZ3000_w5xztuy7'],
  },
  {
    id: 'p94-m1cvyneb-dimmer',
    driver: 'wall_dimmer_tuya',
    mfrs: ['_TZE284_m1cvyneb'],
  },
  {
    id: 'p94-imaccztn-relay',
    driver: 'relay_board_4_channel',
    mfrs: ['_TZ3210_imaccztn'],
  },
];

const failures = [];
const notes = [];

for (const rule of FORBIDDEN) {
  const compose = loadCompose(rule.driver);
  if (!compose) {
    notes.push(`skip ${rule.id}: missing driver ${rule.driver}`);
    continue;
  }
  for (const mfr of rule.mfrs) {
    if (hasMfr(compose, mfr)) {
      failures.push(`FORBIDDEN ${rule.id}: ${mfr} still in drivers/${rule.driver}`);
    }
  }
}

for (const rule of FORBIDDEN_PIDS) {
  const compose = loadCompose(rule.driver);
  if (!compose) {
    notes.push(`skip ${rule.id}: missing driver ${rule.driver}`);
    continue;
  }
  for (const pid of rule.pids) {
    if (hasPid(compose, pid)) {
      failures.push(`FORBIDDEN ${rule.id}: productId ${pid} still in drivers/${rule.driver}`);
    }
  }
}

for (const rule of REQUIRED) {
  const compose = loadCompose(rule.driver);
  if (!compose) {
    // Stable may lack some master-only drivers — soft note, not fail
    notes.push(`skip required ${rule.id}: missing driver ${rule.driver}`);
    continue;
  }
  for (const mfr of rule.mfrs) {
    if (!hasMfr(compose, mfr)) {
      failures.push(`REQUIRED ${rule.id}: ${mfr} missing from drivers/${rule.driver}`);
    }
  }
}

console.log('═══════════════════════════════════════════════');
console.log('  Anti-bot regression gate (P94+)');
console.log(`  root: ${ROOT}`);
console.log('═══════════════════════════════════════════════');
for (const n of notes) console.log(`  ~ ${n}`);
if (failures.length) {
  for (const f of failures) console.log(`  ❌ ${f}`);
  console.log(`\nFAILED: ${failures.length} regression(s)`);
  process.exit(1);
}
console.log('  ✅ No known bot regressions detected');
process.exit(0);
