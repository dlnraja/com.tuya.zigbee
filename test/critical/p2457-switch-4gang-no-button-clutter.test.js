'use strict';

/**
 * P2457 — GH #541: switch_4gang relay UI only (no button.* tiles in app.json).
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

describe('P2457 — switch_4gang no button clutter', () => {
  it('compose + app.json capabilities are relay-only', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/switch_4gang/driver.compose.json'), 'utf8')
    );
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const d = app.drivers.find((x) => x.id === 'switch_4gang');
    assert.ok(d);
    assert.deepStrictEqual(compose.capabilities, [
      'onoff',
      'onoff.gang2',
      'onoff.gang3',
      'onoff.gang4',
      'measure_power',
      'power_on_behavior',
    ]);
    assert.deepStrictEqual(d.capabilities, compose.capabilities);
    assert.ok(!compose.capabilities.some((c) => /^button/.test(c)));
    assert.ok(!d.capabilities.some((c) => /^button/.test(c)));
  });

  it('device.js strips phantom button caps (P2457)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/switch_4gang/device.js'), 'utf8');
    assert.ok(src.includes('_stripPhantomButtonCaps'));
    assert.ok(src.includes('P2457'));
    assert.ok(!/await this\.initVirtualButtons\(\)/.test(src));
  });

  it('enmfaave+TS0004 still locked switch_4gang', () => {
    const { FINGERPRINT_DB } = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
    assert.strictEqual(FINGERPRINT_DB['_TZ3000_enmfaave|TS0004'].driver, 'switch_4gang');
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers/switch_4gang/driver.compose.json'), 'utf8')
    );
    assert.ok(compose.zigbee.manufacturerName.some((m) => /enmfaave/i.test(m)));
    assert.ok(compose.zigbee.productId.includes('TS0004'));
  });
});
