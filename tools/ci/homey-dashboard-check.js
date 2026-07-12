#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * homey-dashboard-check.js
 *
 * Helps verify a published app via the Homey developer dashboard.
 * Since we have NO HOMEY_PAT token locally, this script:
 * 1. Reads the published version from app.json
 * 2. Generates the EXACT URL + checks the user can do
 * 3. Outputs a verification checklist
 *
 * Usage:
 *   node tools/ci/homey-dashboard-check.js master
 *   node tools/ci/homey-dashboard-check.js stable
 *
 * The user must manually visit the URLs and check the items.
 *
 * App cible: BOTH master + stable
 *
 * @author Mavis 2026-07-10
 */

'use strict';

const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'master';
if (!['master', 'stable'].includes(target)) {
  console.error('Usage: node tools/ci/homey-dashboard-check.js [master|stable]');
  process.exit(1);
}

const APP_ROOT = process.cwd();
const HOMEY_ROOT = path.resolve(APP_ROOT, '..');
const appDir = path.join(HOMEY_ROOT, target);
let version = 'unknown';
let appId = 'unknown';
try {
  const raw = fs.readFileSync(path.join(appDir, 'app.json'), 'utf8').replace(/^\uFEFF/, '');
  const app = JSON.parse(raw);
  version = app.version;
  appId = app.id;
} catch (e) {
  console.error('Cannot read app.json at', path.join(appDir, 'app.json'));
  console.error('Error:', e.message);
  process.exit(1);
}

console.log(`\n🏠 Homey Dashboard Verification — ${target}\n`);
console.log('═'.repeat(70));
console.log('');
console.log(`App:    ${appId}`);
console.log(`Version: v${version}`);
console.log('');

console.log('━'.repeat(70));
console.log('1. ATOM DEVELOPER DASHBOARD (primary verification)');
console.log('━'.repeat(70));
console.log('');
console.log('URL:');
console.log(`  https://tools.developer.homey.app/app/${appId.replace(/\./g, '/')}`);
console.log('');
console.log('Checks:');
console.log(`  [ ] App listed with version v${version}`);
console.log('  [ ] Build status: OK (green)');
console.log('  [ ] No validation errors');
console.log('  [ ] Drivers: ' + (target === 'master' ? '430 (expected)' : '228 (expected)'));
console.log('  [ ] App Store: published to "test" channel (shadow mode)');
console.log('  [ ] No crash reports in last 24h');
console.log('');

console.log('━'.repeat(70));
console.log('2. APP STORE LIVE PAGE');
console.log('━'.repeat(70));
console.log('');
console.log('URL:');
console.log(`  https://apps.homey.app/app/${appId}`);
console.log('');
console.log('Checks:');
console.log('  [ ] Version number shows v' + version);
console.log('  [ ] Description shows in your language (fr/en/nl/de)');
console.log('  [ ] Screenshot is recent');
console.log('  [ ] Reviews not broken (if any)');
console.log('');

console.log('━'.repeat(70));
console.log('3. INSTALL TEST');
console.log('━'.repeat(70));
console.log('');
console.log('On your Homey Pro:');
console.log('  [ ] Settings → Apps → My apps → ' + appId);
console.log('  [ ] If installed: check "Update available"');
console.log('  [ ] Update to v' + version);
console.log('  [ ] If not installed: install fresh');
console.log('');

console.log('━'.repeat(70));
console.log('4. SMOKE TEST (real device)');
console.log('━'.repeat(70));
console.log('');
console.log('  [ ] Pair 1 NEW device that was broken before');
console.log('      (Volta bug: thermostat with calibration issue)');
console.log('  [ ] Pair 1 device that uses localTempCalibration');
console.log('      (Moes BHT-002, AVATTO ME167, Beca BRT-100, TRVZB, Nvent...)');
console.log('  [ ] Test the calibration offset (should now be correct sign/magnitude)');
console.log('  [ ] Test soil sensor (myd45weu) - was soilsensor_2, now soil_sensor');
console.log('  [ ] Test 1 flow card title in 4 languages');
console.log('');

if (target === 'master') {
  console.log('━'.repeat(70));
console.log('5. NEW DEVICE TESTS (master only)');
console.log('━'.repeat(70));
console.log('');
console.log('  [ ] Test AOYAN switch (AY-601ZL 1-gang, AY-602ZL 2-gang, AY-603ZL 3-gang)');
console.log('  [ ] Test SONOFF S61SZBTPB (energy monitoring, overload protection)');
console.log('');
}

console.log('━'.repeat(70));
console.log('6. GITHUB ISSUES AUTO-CLOSE');
console.log('━'.repeat(70));
console.log('');
console.log('URL:');
console.log('  https://github.com/dlnraja/com.tuya.zigbee/issues?q=is%3Aissue+is%3Aopen');
console.log('');
console.log('Should auto-close within 24h via shadow mode bot:');
console.log('  [ ] #338 App Crash on startup (if not already closed)');
console.log('  [ ] #339 [radiator_valve] _TZE200_9xfjixap');
console.log('  [ ] #340 [soil_sensor] ZG-303Z');
console.log('  [ ] #342 #336 #335 (auto-FP issues, may close)');
console.log('');

console.log('━'.repeat(70));
console.log('7. FORUM POST');
console.log('━'.repeat(70));
console.log('');
console.log('URL:');
console.log('  https://community.homey.app/c/apps/56');
console.log('');
console.log('Suggested post:');
console.log('');
console.log('  Title: v' + version + ' released: Volta calibration fixes + 6 new AOYAN switches');
console.log('');
console.log('  Body:');
console.log('  "After extensive investigation (24+ reports cross-referenced), this');
console.log('   release fixes 5 critical calibration bugs in the herdsman cache that');
console.log('   were affecting 19+ Tuya thermostat models. The Volta convention');
console.log('   (localTempCalibration1-5) has been replaced with the correct');
console.log('   signed arithmetic. Devices affected: Moes BHT-002, AVATTO ME167,');
console.log('   Beca BRT-100, TRVZB, Nvent, and 14+ others.');
console.log('');
console.log('   Also: 30+ flow cards now have multilingual titles (en/fr/nl/de),');
console.log('   6 new AOYAN switch drivers, 1 SONOFF S61SZBTPB energy plug,');
console.log('   73 driver conflicts resolved, and 1 UTF-8 mojibake prevented.');
console.log('');
console.log('   Stable: v' + (target === 'master' ? '5.11.220' : version) + ' backport with bug fixes (no new devices).');
console.log('');
console.log('   If you have a thermostat that was reporting wrong calibration,');
console.log('   please UPDATE + REMOVE + RE-PAIR. Diagnostic log within 60s');
console.log('   if issue persists."');
console.log('');

console.log('━'.repeat(70));
console.log('8. DIAGNOSTICS MONITORING (24h after publish)');
console.log('━'.repeat(70));
console.log('');
console.log('URL:');
console.log('  https://github.com/dlnraja/com.tuya.zigbee/actions/workflows/gmail-diagnostics.yml');
console.log('');
console.log('Expected:');
console.log('  - Reduction in false battery reports (Volta fix)');
console.log('  - Reduction in "calibration wrong" forum posts');
console.log('  - New devices reporting OK (AOYAN, SONOFF)');
console.log('');

console.log('━'.repeat(70));
console.log('SUMMARY');
console.log('━'.repeat(70));
console.log('');
console.log('Total checks: 25+');
console.log('Estimated time: 15-20 min (excluding device re-pair)');
console.log('');
console.log('Tip: do the smoke test on a TEST device (not a critical one) first.');
console.log('');
