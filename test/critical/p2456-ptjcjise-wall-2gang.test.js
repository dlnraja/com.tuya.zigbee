'use strict';

/**
 * P2456 — GH #543: ptjcjise+TS0002 wired 2-gang → wall_switch_2gang_1way
 * Interview locks TS0002 EP1/EP2. Do not invent TS0001 from later comment.
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

describe('P2456 — ptjcjise+TS0002 wall wired 2-gang', () => {
  it('compose: couple on wall_switch_2gang_1way with relay caps only', () => {
    const w = readCompose('wall_switch_2gang_1way');
    assert.deepStrictEqual(w.capabilities, ['onoff', 'onoff.gang2']);
    assert.ok(!w.devices);
    assert.ok(w.zigbee.manufacturerName.some((m) => /ptjcjise/i.test(m)));
    assert.ok(w.zigbee.productId.includes('TS0002'));
  });

  it('compose: couple removed from switch_2gang and switch_1gang', () => {
    assert.ok(!readCompose('switch_2gang').zigbee.manufacturerName.some((m) => /ptjcjise/i.test(m)));
    assert.ok(!readCompose('switch_1gang').zigbee.manufacturerName.some((m) => /ptjcjise/i.test(m)));
  });

  it('FPDB + fingerprints + mfs lock wall driver (TS0002 only)', () => {
    const { FINGERPRINT_DB } = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
    assert.strictEqual(FINGERPRINT_DB['_TZ3000_ptjcjise|TS0002'].driver, 'wall_switch_2gang_1way');
    assert.ok(!FINGERPRINT_DB['_TZ3000_ptjcjise|TS0001']);
    const fp = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib/tuya/fingerprints.json'), 'utf8'));
    assert.strictEqual(fp._TZ3000_ptjcjise.driverId, 'wall_switch_2gang_1way');
    assert.deepStrictEqual(fp._TZ3000_ptjcjise.modelIds, ['TS0002']);
    const mfs = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8'));
    assert.strictEqual(mfs.sacredCouples['_tz3000_ptjcjise|ts0002'].driver, 'wall_switch_2gang_1way');
  });

  it('registry forbids switch_2gang / switch_1gang for couple', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const c = (reg.cases || []).find((x) => x.id === 'p2456-ptjcjise-ts0002-wall-2gang');
    assert.ok(c);
    assert.strictEqual(c.canonicalDriver, 'wall_switch_2gang_1way');
    assert.ok(c.forbiddenDrivers.includes('switch_2gang'));
    assert.ok(c.forbiddenDrivers.includes('switch_1gang'));
  });
});
