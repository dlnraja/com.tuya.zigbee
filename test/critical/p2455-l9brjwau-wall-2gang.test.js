'use strict';

/**
 * P2455 — GH #544 migueleap: BSEED wired 2-gang → wall_switch_2gang_1way
 * onoff + onoff.gang2 only (no button tiles / secondSwitch / battery UI).
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

function readCompose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

describe('P2455 — l9brjwau+TS0002 wall wired 2-gang', () => {
  it('compose: couple on wall_switch_2gang_1way with relay caps only', () => {
    const w = readCompose('wall_switch_2gang_1way');
    assert.deepStrictEqual(w.capabilities, ['onoff', 'onoff.gang2']);
    assert.ok(!w.devices, 'no devices.secondSwitch');
    assert.ok(!w.capabilitiesOptions?.measure_battery, 'no battery options clutter');
    assert.ok(w.zigbee.manufacturerName.some((m) => /l9brjwau/i.test(m)));
    assert.ok(w.zigbee.productId.includes('TS0002'));
    assert.ok(!Object.keys(w.capabilitiesOptions || {}).some((k) => k.startsWith('button')));
  });

  it('compose: couple removed from switch_2gang', () => {
    const s = readCompose('switch_2gang');
    assert.ok(!s.zigbee.manufacturerName.some((m) => /l9brjwau/i.test(m)));
  });

  it('FPDB + fingerprints + mfs sacredCouples lock wall driver', () => {
    const { FINGERPRINT_DB } = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
    assert.strictEqual(FINGERPRINT_DB['_TZ3000_l9brjwau|TS0002'].driver, 'wall_switch_2gang_1way');
    const fp = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/tuya/fingerprints.json'), 'utf8'));
    assert.strictEqual(fp._TZ3000_l9brjwau.driverId, 'wall_switch_2gang_1way');
    assert.ok(fp._TZ3000_l9brjwau.modelIds.includes('TS0002'));
    const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
    assert.strictEqual(mfs.sacredCouples['_tz3000_l9brjwau|ts0002'].driver, 'wall_switch_2gang_1way');
    assert.strictEqual(mfs['_tz3000_l9brjwau'].driverId, 'wall_switch_2gang_1way');
  });

  it('registry forbids switch_2gang / switch_2_gang for couple', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const c = (reg.cases || reg).find((x) => x.id === 'p2455-l9brjwau-ts0002-wall-2gang');
    assert.ok(c);
    assert.strictEqual(c.canonicalDriver, 'wall_switch_2gang_1way');
    assert.ok(c.forbiddenDrivers.includes('switch_2gang'));
    assert.ok(c.forbiddenDrivers.includes('switch_2_gang'));
  });
});
