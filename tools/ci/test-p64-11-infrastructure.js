#!/usr/bin/env node
'use strict';

/**
 * tools/ci/test-p64-11-infrastructure.js
 *
 * Tests the P64.11 infrastructure: herdsman cache, DP registry, Homey SDK3 audit.
 *
 * These are the "smart" cross-references the user asked for:
 * - Z2M herdsman-converters cached locally (no spam re-fetching 1.3MB)
 * - DP registry cross-references Z2M + drivers + manual
 * - Homey SDK3 capability audit validates all our capabilities
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
  else      { failed++; console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
}
function test(name, fn) {
  console.log(`\n\x1b[36m${name}\x1b[0m`);
  try { fn(); } catch (e) { failed++; console.log(`  \x1b[31m✗\x1b[0m ${e.message}`); }
}

console.log('\n\x1b[1mP64.11 infrastructure tests\x1b[0m');

test('Z2M herdsman cache exists and has devices', () => {
  const p = path.join(REPO, 'data', 'z2m_herdsman_cache.json');
  assert(fs.existsSync(p), 'data/z2m_herdsman_cache.json exists');
  if (!fs.existsSync(p)) return;
  const cache = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert(cache._meta, 'has _meta');
  assert(cache._meta.deviceCount > 1000, `deviceCount > 1000 (got: ${cache._meta.deviceCount})`);
  assert(cache._meta.mfrCount > 500, `mfrCount > 500 (got: ${cache._meta.mfrCount})`);
  assert(cache.devices && cache.devices.length > 0, 'has devices array');
  assert(cache.byMfr && Object.keys(cache.byMfr).length > 0, 'has byMfr index');
  // Check we can lookup a known MFR
  const knownMfrs = ['_TZE200_ka8l86iu', '_TZE200_uli8wasj', '_TZE200_2aaelwxk'];
  for (const mfr of knownMfrs) {
    const idxs = cache.byMfr[mfr] || [];
    assert(idxs.length > 0, `byMfr[${mfr}] has ${idxs.length} entries`);
  }
});

test('Z2M cache has modelIds (not just model)', () => {
  const p = path.join(REPO, 'data', 'z2m_herdsman_cache.json');
  const cache = JSON.parse(fs.readFileSync(p, 'utf8'));
  const sample = cache.devices.find(d => (d.modelIds || []).length > 0);
  assert(sample, 'at least one device has modelIds');
  if (sample) {
    assert(sample.modelIds.includes('TS0601') || sample.modelIds.some(m => m.startsWith('TS')),
      `sample device has TS* modelId (${sample.modelIds.join(', ')})`);
  }
});

test('DP registry exists and is cross-referenced', () => {
  const p = path.join(REPO, 'data', 'dp_registry.json');
  assert(fs.existsSync(p), 'data/dp_registry.json exists');
  if (!fs.existsSync(p)) return;
  const reg = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert(reg._meta, 'has _meta');
  assert(Object.keys(reg.byDp).length > 100, `byDp has > 100 unique DPs (got: ${Object.keys(reg.byDp).length})`);
  assert(Object.keys(reg.byMfr).length > 500, `byMfr has > 500 MFRs (got: ${Object.keys(reg.byMfr).length})`);
  // The infamous DP 105 (was moisture bug, now humidity_calibration on ZG-303Z)
  const dp105 = reg.byDp['105'] || [];
  assert(dp105.length > 50, `DP 105 has > 50 usages (got: ${dp105.length})`);
  // Verify the 94 different names for DP 105 don't include "moisture" or "soil"
  const soilNames = dp105.filter(e => /moisture|soil/i.test(e.name || e.action || ''));
  assert(soilNames.length === 0, `DP 105 has NO "moisture" or "soil" names (bug fix locked in)`);
});

test('Homey SDK3 audit exists and is reasonable', () => {
  const p = path.join(REPO, 'data', 'homey_sdk3_audit.json');
  assert(fs.existsSync(p), 'data/homey_sdk3_audit.json exists');
  if (!fs.existsSync(p)) return;
  const audit = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert(audit._meta.totalSdkCaps >= 90, `totalSdkCaps >= 90 (got: ${audit._meta.totalSdkCaps})`);
  assert(audit._meta.totalUsedCaps >= 100, `totalUsedCaps >= 100 (got: ${audit._meta.totalUsedCaps})`);
  console.log(`  \x1b[36mi\x1b[0m Total: ${audit._meta.totalSdkCaps} SDK3 caps, ${audit._meta.totalUsedCaps} used, ${audit._meta.totalBad} bad`);
});

test('Soil sensor capabilities are all valid Homey SDK3', () => {
  const audit = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'homey_sdk3_audit.json'), 'utf8'));
  const soilDriver = JSON.parse(fs.readFileSync(
    path.join(REPO, 'drivers', 'soil_sensor', 'driver.compose.json'), 'utf8'));
  const soilCaps = soilDriver.capabilities || [];
  // Check that no soil_sensor capability is in the audit's "bad" list
  const bad = new Set((audit.bad || []).map(b => b.cap));
  for (const cap of soilCaps) {
    assert(!bad.has(cap), `soil_sensor capability ${cap} is NOT in audit.bad list`);
  }
});

test('soil_sensor_moisture_changed flow card has correct token types', () => {
  const flow = JSON.parse(fs.readFileSync(
    path.join(REPO, 'drivers', 'soil_sensor', 'driver.flow.compose.json'), 'utf8'));
  const card = flow.triggers.find(t => t.id === 'soil_sensor_moisture_changed');
  assert(card, 'soil_sensor_moisture_changed flow card exists');
  if (card) {
    const tok = (card.tokens || []).find(t => t.name === 'moisture');
    assert(tok, 'has moisture token');
    if (tok) {
      assert(tok.type === 'number', `moisture token type is "number" (got: ${tok.type})`);
      assert(typeof tok.example === 'number', `moisture token example is number (got: ${typeof tok.example})`);
      assert(tok.example >= 0 && tok.example <= 100, `moisture example in 0-100 range (got: ${tok.example})`);
    }
  }
});

test('sensor_contact_zigbee has HOBEIAN in manufacturerName', () => {
  const driver = JSON.parse(fs.readFileSync(
    path.join(REPO, 'drivers', 'sensor_contact_zigbee', 'driver.compose.json'), 'utf8'));
  const mfrs = (driver.zigbee?.manufacturerName || []).map(m => m.toLowerCase());
  assert(mfrs.includes('hobeian'), 'HOBEIAN in manufacturerName');
});

test('presence_sensor_radar has anti_interference setting', () => {
  const driver = JSON.parse(fs.readFileSync(
    path.join(REPO, 'drivers', 'presence_sensor_radar', 'driver.compose.json'), 'utf8'));
  const settings = driver.settings || [];
  const ai = settings.find(s => s.id === 'anti_interference');
  assert(ai, 'anti_interference setting present');
  if (ai) {
    assert(ai.type === 'checkbox', `anti_interference type is checkbox (got: ${ai.type})`);
  }
});

test('presence_sensor_radar ZG_204ZV_MULTISENSOR includes Peter MFRs', () => {
  const cfg = fs.readFileSync(
    path.join(REPO, 'drivers', 'presence_sensor_radar', 'configs.js'), 'utf8');
  assert(cfg.includes('ZG_204ZV_MULTISENSOR'), 'has ZG_204ZV_MULTISENSOR config');
  assert(cfg.includes('_TZE200_rhgsbacq'), 'has _TZE200_rhgsbacq');
  assert(cfg.includes('_TZE200_y8jijhba'), 'has _TZE200_y8jijhba');
});

test('soil_sensor isZG303ZVariant getter covers 12 MFRs', () => {
  const dev = fs.readFileSync(
    path.join(REPO, 'drivers', 'soil_sensor', 'device.js'), 'utf8');
  const mfrs = ['_tze200_wqashyqo', '_tze284_awepdiwi', '_tze284_ga1maeof',
                '_tze284_myd45weu', '_tze200_myd45weu', '_tze284_oitavov2',
                '_tze284_2nhqasjh', '_tze284_aao3yzhs', '_tze284_tgrzpqf4',
                '_tze284_0ints6wl', '_tze200_npj9bug3', 'hobeian'];
  for (const m of mfrs) {
    assert(dev.includes(m), `isZG303ZVariant covers ${m}`);
  }
});

test('soil_sensor DP 105 NOT in moisture flow path', () => {
  const dev = fs.readFileSync(
    path.join(REPO, 'drivers', 'soil_sensor', 'device.js'), 'utf8');
  const m = dev.match(/if \(dp === 2 \|\| dp === 3 \|\| dp === (\d+)\)/);
  assert(m, 'has moisture DP check');
  if (m) {
    assert(m[1] !== '105', `moisture DPs do NOT include 105 (was the bug, got: ${m[1]})`);
    assert(m[1] === '107', `moisture DPs include 107 (the fix, got: ${m[1]})`);
  }
});

console.log(`\n\x1b[1m${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed === 0 ? 0 : 1);
