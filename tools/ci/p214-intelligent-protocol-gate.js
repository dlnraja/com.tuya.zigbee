#!/usr/bin/env node
'use strict';

/**
 * Gate: all driver lineages must adapt ZCL ↔ EF00 via IntelligentProtocolDetect.
 * Exit 0 = pass, 1 = fail.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const failures = [];

function ok(m) { console.log(`  ✅ ${m}`); }
function fail(m) { failures.push(m); console.error(`  ❌ ${m}`); }

console.log('P214 intelligent ZCL/EF00 adaptation gate\n');

const must = [
  'lib/protocol/IntelligentProtocolDetect.js',
  'lib/layers/UniversalLayerBootstrap.js',
  'lib/devices/UnifiedSwitchBase.js',
  'lib/devices/UnifiedSensorBase.js',
  'lib/devices/UnifiedPlugBase.js',
  'lib/devices/UnifiedLightBase.js',
  'lib/devices/UnifiedCoverBase.js',
  'lib/devices/UnifiedThermostatBase.js',
  'test/critical/p214-intelligent-protocol-detect.test.js',
];

for (const rel of must) {
  if (fs.existsSync(path.join(ROOT, rel))) ok(`exists ${rel}`);
  else fail(`missing ${rel}`);
}

const {
  detectIntelligentProtocol,
  isSacredZclOnlyManufacturer,
} = require(path.join(ROOT, 'lib', 'protocol', 'IntelligentProtocolDetect.js'));

if (!isSacredZclOnlyManufacturer('_TZ3000_w5xztuy7')) {
  fail('BSEED w5xztuy7 must be sacred zcl_only');
} else ok('BSEED w5xztuy7 sacred zcl_only');

function mock(mfr, modelId, clusters) {
  return {
    getSettings: () => ({ zb_manufacturer_name: mfr, zb_model_id: modelId }),
    getData: () => ({ manufacturerName: mfr, modelId }),
    getStore: () => ({}),
    zclNode: { endpoints: { 1: { clusters } }, manufacturerName: mfr, modelId },
  };
}

const leftover = detectIntelligentProtocol(mock('_TZ3000_jjdkhueq', 'TS0002', { onOff: {}, tuya: {} }));
if (leftover.protocol === 'zcl_only' && leftover.reason === 'ts000x_zcl_switch_ignore_leftover_ef00') {
  ok('TS000x leftover EF00 → zcl_only (no gang bleed)');
} else fail(`expected leftover zcl_only, got ${JSON.stringify(leftover)}`);

const hybrid = detectIntelligentProtocol(mock('_TZE200_shkxsgis', 'TS0601', { onOff: {}, tuya: {} }));
if (hybrid.protocol === 'HYBRID' && hybrid.listenHybrid) ok('MCU EF00+ZCL → HYBRID listen');
else fail(`expected HYBRID, got ${JSON.stringify(hybrid.protocol)}`);

const dp = detectIntelligentProtocol(mock('_TZE284_m1cvyneb', 'TS0601', { tuya: {} }));
if (dp.protocol === 'TUYA_DP' && dp.isPureTuyaDP) ok('EF00-only → TUYA_DP');
else fail(`expected TUYA_DP, got ${JSON.stringify(dp)}`);

const escape = detectIntelligentProtocol(mock('_TZE200_3towulqd', 'TS0601', { iasZone: {} }));
if (escape.protocol === 'ZCL') ok('TS0601 ZCL escape (no EF00)');
else fail(`TS0601 escape failed: ${escape.protocol}`);

const router = fs.readFileSync(path.join(ROOT, 'lib', 'protocol', 'IntelligentProtocolRouter.js'), 'utf8');
if (/REQUIRES Tuya DP/.test(router) && /BSEED device detected - REQUIRES/.test(router)) {
  fail('IntelligentProtocolRouter still forces BSEED onto Tuya DP');
} else if (/isSacredZclOnlyManufacturer/.test(router)) {
  ok('IntelligentProtocolRouter respects sacred zcl_only');
} else {
  fail('IntelligentProtocolRouter missing sacred zcl_only guard');
}

const bootstrap = fs.readFileSync(path.join(ROOT, 'lib', 'layers', 'UniversalLayerBootstrap.js'), 'utf8');
if (/applyIntelligentProtocol/.test(bootstrap) && /TuyaEF00Manager/.test(bootstrap)) {
  ok('UniversalLayerBootstrap wires detect + EF00 soft-attach');
} else {
  fail('UniversalLayerBootstrap incomplete hybrid attach');
}

console.log('');
if (failures.length) {
  console.error(`FAIL: ${failures.length}`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log('PASS: P214 intelligent ZCL/EF00 adaptation gate');
process.exit(0);
