'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const DeviceFingerprintDB = require(path.join(ROOT, 'lib/DeviceFingerprintDB'));

const HOBEIAN_FLEET = [
  { pid: 'ZG-101ZL', expectedDriver: 'button_wireless_1' },
  { pid: 'ZG-101ZS', expectedDriver: 'scene_switch_4' },
  { pid: 'ZG-101ZD', expectedDriver: 'button_wireless_1' },
  { pid: 'ZG-102Z', expectedDriver: 'contact_sensor' },
  { pid: 'ZG-102ZL', expectedDriver: 'contact_sensor' },
  { pid: 'ZG-102ZM', expectedDriver: 'vibration_sensor' },
  { pid: 'ZG-103Z', expectedDriver: 'vibration_sensor' },
  { pid: 'ZG-103ZL', expectedDriver: 'vibration_sensor' },
  { pid: 'ZG-106Z', expectedDriver: 'illuminance_sensor' },
  { pid: 'ZG-204Z', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-204ZE', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-204ZH', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-204ZK', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-204ZL', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-204ZM', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-204ZP', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-204ZQ', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-204ZV', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-204ZX', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-205Z', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-205ZL', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-222Z', expectedDriver: 'water_leak_sensor' },
  { pid: 'ZG-222ZA', expectedDriver: 'water_leak_sensor' },
  { pid: 'ZG-223Z', expectedDriver: 'rain_sensor' },
  { pid: 'ZG-225Z', expectedDriver: 'gas_sensor' },
  { pid: 'ZG-226Z', expectedDriver: 'water_leak_sensor' },
  { pid: 'ZG-227Z', expectedDriver: 'climate_sensor' },
  { pid: 'ZG-227ZL', expectedDriver: 'climate_sensor' },
  { pid: 'ZG-228Z', expectedDriver: 'vibration_sensor' },
  { pid: 'ZG-229Z', expectedDriver: 'siren' },
  { pid: 'ZG-301Z', expectedDriver: 'switch_1gang' },
  { pid: 'ZG-301Z-2CH', expectedDriver: 'switch_2gang' },
  { pid: 'ZG-302Z1', expectedDriver: 'switch_1gang' },
  { pid: 'ZG-302Z2', expectedDriver: 'switch_2gang' },
  { pid: 'ZG-302Z3', expectedDriver: 'switch_3gang' },
  { pid: 'ZG-302ZL', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-302ZM', expectedDriver: 'presence_sensor_radar' },
  { pid: 'ZG-303Z', expectedDriver: 'soil_sensor' },
  { pid: 'ZG-305Z', expectedDriver: 'switch_2gang' },
  { pid: '3315-S', expectedDriver: 'water_leak_sensor' },
  { pid: '3315-Seu', expectedDriver: 'water_leak_sensor' }
];

describe('P2430 HOBEIAN Full Fleet Couple Routing & Anti-Misattribution', () => {

  it('DeviceFingerprintDB resolves exact, case-insensitive, and alias (heobian) for all fleet models', () => {
    for (const item of HOBEIAN_FLEET) {
      const exact = DeviceFingerprintDB.lookup('HOBEIAN', item.pid);
      assert.ok(exact, `Missing exact lookup for HOBEIAN|${item.pid}`);
      assert.strictEqual(exact.driver, item.expectedDriver, `Driver mismatch for ${item.pid}: got ${exact.driver}, expected ${item.expectedDriver}`);

      const ci = DeviceFingerprintDB.lookup('hobeian', item.pid.toLowerCase());
      assert.ok(ci, `Missing case-insensitive lookup for hobeian|${item.pid.toLowerCase()}`);
      assert.strictEqual(ci.driver, item.expectedDriver, `CI Driver mismatch for ${item.pid}`);

      const alias = DeviceFingerprintDB.lookup('heobian', item.pid);
      assert.ok(alias, `Missing alias lookup for heobian|${item.pid}`);
      assert.strictEqual(alias.driver, item.expectedDriver, `Alias Driver mismatch for ${item.pid}`);
    }
  });

  it('UserMisattributionRegistry enforces couple-scoped forbids and prevents cross-driver misroutes', () => {
    const registryData = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const cases = Array.isArray(registryData) ? registryData : registryData.cases;

    // Verify switch_1gang lock
    const sw1 = cases.find(c => c.id === 'hobeian-zg301z-switch');
    assert.ok(sw1, 'hobeian-zg301z-switch case registered');
    assert.strictEqual(sw1.canonicalDriver, 'switch_1gang');
    assert.strictEqual(sw1.forbidMode, 'couple');

    // Verify switch_2gang lock
    const sw2 = cases.find(c => c.id === 'hobeian-zg301z-2ch-switch');
    assert.ok(sw2, 'hobeian-zg301z-2ch-switch case registered');
    assert.strictEqual(sw2.canonicalDriver, 'switch_2gang');
    assert.strictEqual(sw2.forbidMode, 'couple');

    // Verify radar lock includes ZG-204ZP
    const radar = cases.find(c => c.id === 'hobeian-zg204-presence');
    assert.ok(radar, 'hobeian-zg204-presence case registered');
    assert.ok(radar.productId.includes('ZG-204ZP'), 'radar case includes ZG-204ZP');
  });

  it('Sacred-keep protects HOBEIAN fleet couples against publish compaction drops', () => {
    const skPath = path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json');
    const sk = JSON.parse(fs.readFileSync(skPath, 'utf8'));
    const couples = sk.couples || [];

    const keyCouples = ['ZG-303Z', 'ZG-227Z', 'ZG-204ZM', 'ZG-101ZL', 'ZG-102Z', 'ZG-222Z', 'ZG-301Z', 'ZG-305Z'];
    for (const pid of keyCouples) {
      const match = couples.find(c => c.mfr.toUpperCase() === 'HOBEIAN' && c.pid.toUpperCase() === pid.toUpperCase());
      assert.ok(match, `Sacred-keep missing HOBEIAN|${pid}`);
    }
  });

  it('Diagnostic consistency check passes with zero errors and zero warnings', () => {
    const checkScript = path.join(ROOT, 'scripts/diag/hobeian-consistency-check.js');
    const { execSync } = require('child_process');
    const output = execSync(`node "${checkScript}"`, { encoding: 'utf8' });
    assert.ok(output.includes('Erreurs : 0'), 'Consistency check must have 0 errors');
    assert.ok(output.includes('Warnings : 0'), 'Consistency check must have 0 warnings');
  });

});
