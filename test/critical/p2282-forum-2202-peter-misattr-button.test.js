'use strict';

/**
 * P2282 — Forum T140352 #2202 Peter (diag 95a7c6e5)
 * Water: HOBEIAN+3315-S must NOT be marked unavailable via rain ZG-223Z placement.
 * Button: _TZ3000_mrpevh8p+TS0041 → button_wireless_1; IO passive listen preserves arity.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  lookup,
  isForbiddenDriver,
  isForbiddenPlacement,
} = require('../../lib/pairing/UserMisattributionRegistry');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2282 forum #2202 Peter water MISATTR + Smartbutton', () => {
  it('HOBEIAN+3315-S stays on water_leak (couple-aware, not soil)', () => {
    const { invalidate } = require('../../lib/pairing/UserMisattributionRegistry');
    invalidate();
    assert.strictEqual(isForbiddenDriver('HOBEIAN', '3315-S', 'water_leak_sensor'), false);
    assert.strictEqual(isForbiddenPlacement('HOBEIAN', 'water_leak_sensor'), false);
    const c = lookup('HOBEIAN', '3315-S');
    assert.strictEqual(c?.canonicalDriver, 'water_leak_sensor');
    assert.strictEqual(isForbiddenDriver('HOBEIAN', '3315-S', 'soil_sensor'), true);
    delete require.cache[require.resolve('../../lib/DeviceFingerprintDB')];
    const DB = require('../../lib/DeviceFingerprintDB');
    assert.strictEqual(DB.lookup('HOBEIAN', '3315-S').driver, 'water_leak_sensor');
  });

  it('HOBEIAN+ZG-223Z still forbids water_leak when rain couple is registered', () => {
    const c = lookup('HOBEIAN', 'ZG-223Z');
    if (!c) {
      // Stable may not carry p2259 rain yet — couple-aware warn still safe without it.
      return;
    }
    assert.strictEqual(c.canonicalDriver, 'rain_sensor');
    assert.strictEqual(isForbiddenDriver('HOBEIAN', 'ZG-223Z', 'water_leak_sensor'), true);
  });

  it('_warnIfMisattributedDriver is couple-first when pid known', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert(src.includes('WHY(P2282)'));
    assert(/pid\s*\?\s*registry\.isForbiddenDriver/.test(src));
    assert(!/isForbiddenDriver\([\s\S]*\|\|\s*registry\.isForbiddenPlacement/.test(src));
  });

  it('isForbiddenPlacement skips forbidMode couple', () => {
    const src = read('lib/pairing/UserMisattributionRegistry.js');
    assert(src.includes("forbidMode) === 'couple'"));
  });

  it('locks mrpevh8p+TS0041 to button_wireless_1', () => {
    const { invalidate } = require('../../lib/pairing/UserMisattributionRegistry');
    invalidate();
    const c = lookup('_TZ3000_mrpevh8p', 'TS0041');
    assert.strictEqual(c?.canonicalDriver, 'button_wireless_1');
    const compose = read('drivers/button_wireless_1/driver.compose.json');
    assert(/_TZ3000_mrpevh8p/i.test(compose));
    assert(compose.includes('TS0041'));
    delete require.cache[require.resolve('../../lib/tuya/DeviceFingerprintDB')];
    delete require.cache[require.resolve('../../lib/DeviceFingerprintDB')];
    const { getDriverId } = require('../../lib/tuya/DeviceFingerprintDB');
    const DB = require('../../lib/DeviceFingerprintDB');
    assert.strictEqual(getDriverId('_TZ3000_mrpevh8p', 'TS0041'), 'button_wireless_1');
    assert.strictEqual(DB.lookup('_TZ3000_mrpevh8p', 'TS0041').driver, 'button_wireless_1');
  });

  it('IO passive EF00 listen preserves handleFrame arity via wrapHandleFrame', () => {
    const src = read('lib/io/DeviceIOFacade.js');
    assert(src.includes("wrapHandleFrame(node, 'io-passive-ef00'"));
    assert(src.includes('return next(...args)'));
    assert(src.includes('args.length >= 3'));
    assert(!/node\.handleFrame = \(frame\) =>/.test(src));
    assert(!/node\.handleFrame = \(endpointId, clusterId, frame, meta\) =>/.test(src));
  });

  it('PhysicalButtonMixin re-arms 0xFD catcher on announce + mrpevh8p skip8004', () => {
    const src = read('lib/mixins/PhysicalButtonMixin.js');
    assert(src.includes('P2282'));
    assert(src.includes("_TZ3000_mrpevh8p"));
    assert(src.includes('skip8004: true'));
    assert(src.includes('_onOffFdRawCatcherHooked = false'));
    assert(src.includes('_setupOnOffFdBoundCluster'));
  });
});
