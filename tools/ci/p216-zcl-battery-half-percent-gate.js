#!/usr/bin/env node
'use strict';

/**
 * P216 — refuse blind ZCL battery /2 on hot paths (100% → 50%).
 * WHY: ZCL spec is 0–200 half-percent; Tuya often already sends 0–100.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const files = [
  'lib/devices/BaseUnifiedDevice.js',
  'lib/devices/UnifiedSensorBase.js',
  'lib/managers/DynamicCapabilityManager.js',
  'lib/tuya/TuyaUnifiedParser.js',
  'lib/tuya/DataRecoveryManager.js',
  'lib/tuya/TuyaSyncManager.js',
  'drivers/generic_diy/device.js',
];

const BAD = [
  /batteryPercentageRemaining\s*\/\s*2/,
  /Math\.min\(100,\s*Math\.round\(\s*(?:value|v)\s*\/\s*2\s*\)\)/,
];

let fail = 0;
for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const rx of BAD) {
    if (rx.test(src)) {
      console.error(`❌ ${rel} still matches ${rx}`);
      fail += 1;
    }
  }
}

const { normalizeZclBatteryPercent } = require(path.join(ROOT, 'lib', 'battery', 'zcl-percent.js'));
if (normalizeZclBatteryPercent(100) !== 100) {
  console.error('❌ 100 must stay 100% (Tuya 0–100 scale)');
  fail += 1;
}
if (normalizeZclBatteryPercent(200) !== 100) {
  console.error('❌ 200 must become 100% (ZCL half-percent)');
  fail += 1;
}

if (fail) {
  console.error(`FAIL P216 (${fail})`);
  process.exit(1);
}
console.log('PASS: P216 ZCL battery half-percent (no blind /2)');
process.exit(0);
