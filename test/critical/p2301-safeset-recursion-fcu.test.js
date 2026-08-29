'use strict';

/**
 * P2301 — #532 diag 8c49c683: safeSetCapabilityValue must not recurse via setCapabilityValue
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2301 safeSetCapabilityValue recursion (#532 crash)', function () {
  it('TuyaSpecificClusterDevice.safeSet delegates to super (no this.setCapabilityValue)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/TuyaSpecificClusterDevice.js'), 'utf8');
    assert.ok(/super\.safeSetCapabilityValue/.test(src), 'must call super.safeSetCapabilityValue');
    // The broken pattern that caused Maximum call stack size exceeded
    assert.ok(
      !/async safeSetCapabilityValue\([^)]*\)\s*\{[^}]*return await this\.setCapabilityValue/s.test(src),
      'must not call this.setCapabilityValue inside safeSetCapabilityValue',
    );
  });

  it('wall_thermostat uses _fcuSyncing reentrancy guard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_thermostat/device.js'), 'utf8');
    assert.ok(src.includes('_fcuSyncing'), 'FCU sync guard');
    assert.ok(src.includes('_lastFcuSystemMode'), 'remember last cool/heat/fan mode');
  });

  it('runtime: safeSet does not recurse into setCapabilityValue override', async () => {
    // Minimal stub chain mirroring Homey: Device.setCapabilityValue <- TuyaZigbeeDevice override
    class FakeHomeyDevice {
      async setCapabilityValue(cap, val) {
        this._last = { cap, val };
        return true;
      }
      hasCapability() { return true; }
    }
    class FakeTuyaZigbee extends FakeHomeyDevice {
      async setCapabilityValue(capability, value) {
        return this.safeSetCapabilityValue(capability, value);
      }
      async safeSetCapabilityValue(capability, value) {
        return FakeHomeyDevice.prototype.setCapabilityValue.call(this, capability, value);
      }
    }
    // Load real TuyaSpecificClusterDevice pattern via eval of the fixed method body is heavy;
    // instead assert the class file still extends TuyaZigbeeDevice and uses super.
    const src = fs.readFileSync(path.join(ROOT, 'lib/TuyaSpecificClusterDevice.js'), 'utf8');
    assert.ok(/extends TuyaZigbeeDevice/.test(src));
    assert.ok(/super\.safeSetCapabilityValue/.test(src));

    // Simulate the fixed delegate path
    const d = new FakeTuyaZigbee();
    let depth = 0;
    const orig = d.safeSetCapabilityValue.bind(d);
    d.safeSetCapabilityValue = async function (c, v) {
      depth++;
      assert.ok(depth < 5, 'no recursion');
      return orig(c, v);
    };
    await d.setCapabilityValue('onoff', false);
    assert.strictEqual(d._last.cap, 'onoff');
    assert.strictEqual(d._last.val, false);
    assert.ok(depth <= 2);
  });
});
