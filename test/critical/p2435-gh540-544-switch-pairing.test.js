'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readCompose(driverId) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driverId, 'driver.compose.json'), 'utf8'));
}

describe('P2435 — GH #540–#544 switch pairing endpoints + sacred couples', () => {
  it('switch_4gang endpoints are ZCL-safe (no required EF00 61184)', () => {
    const c = readCompose('switch_4gang');
    const ep1 = c.zigbee.endpoints['1'];
    assert.ok(ep1.clusters.includes(0) && ep1.clusters.includes(6));
    assert.ok(!ep1.clusters.includes(61184), 'EF00 must not be required for ZCL TS0004 pairing');
    assert.deepStrictEqual(ep1.bindings, [6]);
    for (const ep of ['2', '3', '4']) {
      assert.deepStrictEqual(c.zigbee.endpoints[ep].clusters, [4, 5, 6]);
      assert.deepStrictEqual(c.zigbee.endpoints[ep].bindings, [6]);
    }
    assert.ok(c.zigbee.manufacturerName.some((m) => /enmfaave/i.test(m)));
    assert.ok(c.zigbee.productId.includes('TS0004'));
  });

  it('wall_switch_2gang_1way ep2 has no Basic/Identify (TS0012 match)', () => {
    const c = readCompose('wall_switch_2gang_1way');
    const ep2 = c.zigbee.endpoints['2'];
    assert.deepStrictEqual(ep2.clusters, [4, 5, 6]);
    assert.ok(!ep2.clusters.includes(0) && !ep2.clusters.includes(3));
    assert.ok(c.zigbee.manufacturerName.some((m) => /xk5udnd6/i.test(m)));
    assert.ok(c.zigbee.productId.includes('TS0012'));
  });

  it('water_leak_sensor must not claim _TZ3000_xk5udnd6', () => {
    const c = readCompose('water_leak_sensor');
    assert.ok(!c.zigbee.manufacturerName.some((m) => /xk5udnd6/i.test(m)));
  });

  it('ptjcjise+TS0002 lives on switch_2gang, not switch_1gang', () => {
    const g2 = readCompose('switch_2gang');
    const g1 = readCompose('switch_1gang');
    assert.ok(g2.zigbee.manufacturerName.some((m) => /ptjcjise/i.test(m)));
    assert.ok(g2.zigbee.productId.includes('TS0002'));
    assert.ok(!g1.zigbee.manufacturerName.some((m) => /ptjcjise/i.test(m)));
  });

  it('switch_2gang / switch_1gang expose ZCL Groups/Scenes for Homey match', () => {
    const g2 = readCompose('switch_2gang');
    assert.deepStrictEqual(g2.zigbee.endpoints['1'].clusters, [0, 4, 5, 6]);
    assert.deepStrictEqual(g2.zigbee.endpoints['2'].clusters, [4, 5, 6]);
    const g1 = readCompose('switch_1gang');
    assert.deepStrictEqual(g1.zigbee.endpoints['1'].clusters, [0, 4, 5, 6]);
    assert.ok(g1.zigbee.manufacturerName.some((m) => /blhvsaqf/i.test(m)));
  });

  it('DeviceFingerprintDB routes P2435 couples', () => {
    const { FINGERPRINT_DB } = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
    assert.strictEqual(FINGERPRINT_DB['_TZ3000_enmfaave|TS0004'].driver, 'switch_4gang');
    assert.strictEqual(FINGERPRINT_DB['_TZ3000_xk5udnd6|TS0012'].driver, 'wall_switch_2gang_1way');
    assert.strictEqual(FINGERPRINT_DB['_TZ3000_ptjcjise|TS0002'].driver, 'switch_2gang');
    assert.strictEqual(FINGERPRINT_DB['_TZ3000_l9brjwau|TS0002'].driver, 'switch_2gang');
    assert.strictEqual(FINGERPRINT_DB['_TZ3000_blhvsaqf|TS0001'].driver, 'switch_1gang');
  });

  it('mfs_db top-level xk5udnd6 is not water_leak_sensor', () => {
    const db = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'mfs_db.json'), 'utf8'));
    assert.strictEqual(db['_tz3000_xk5udnd6'].driverId, 'wall_switch_2gang_1way');
  });
});
