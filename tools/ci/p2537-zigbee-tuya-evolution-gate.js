#!/usr/bin/env node
'use strict';

/**
 * P2537 — Enforce Homey Zigbee/Tuya evolution implications
 *
 * 1. RF coexistence: Wi-Fi 1/6/11 ↔ Zigbee/Thread 15/20/25 @ 20 MHz
 * 2. Do not invent Suzi / Green Power productIds
 * 3. Never hardcode a single MCU time format (guessFormat + fallback chain)
 * 4. Zigbee 4.0 / Suzi awareness ≠ new compose clusters without interview
 *
 * Usage: node tools/ci/p2537-zigbee-tuya-evolution-gate.js
 */

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { assertHomeyImplications, zigbeeTuyaEvolutionBrief } = require(
  path.join(ROOT, 'lib', 'utils', 'zigbee-tuya-evolution.js')
);

console.log('P2537 Zigbee/Tuya evolution implications gate\n');

const brief = zigbeeTuyaEvolutionBrief();
console.log(`  current=${brief.currentZigbeeId} suziReplaces24ghz=${brief.suziReplaces24ghz}`);
for (const line of brief.implications) {
  console.log(`  • ${line}`);
}
console.log('');

const result = assertHomeyImplications({ scanDrivers: true });
if (!result.ok) {
  for (const f of result.failures) {
    console.error(`  ❌ ${f}`);
  }
  console.error(`\nP2537 FAIL (${result.failures.length})`);
  process.exit(1);
}

console.log('  ✅ RF coexistence 1/6/11 ↔ 15/20/25 @ 20 MHz');
console.log('  ✅ No invented Suzi / Green Power identities in driver compose');
console.log('  ✅ MCU time uses guessFormat + fallback chain');
console.log('  ✅ No Suzi/sub-GHz awareness tags smuggled into compose');
console.log('\nP2537 PASS');
process.exit(0);
