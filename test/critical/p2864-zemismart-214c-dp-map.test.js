'use strict';

/**
 * P2864 — Zemismart 214C (`_TZE284_vuwtqx0t` / `_TZE200_vuwtqx0t`, TS0601) DP map.
 * Source of truth: Zigbee2MQTT `TS0601_water_valve` (same fingerprint) and the Zemismart ZHA quirk 214c.py.
 * Forum: Homey community topic 101901 post #8 (Steve_Wilson interview). DP1 is the water meter total,
 * the valve is DP13: the generic metered map treated DP1 as on/off and wrote the valve to DP1.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const Module = require('module');

// Hermetic Homey stubs scoped to our own requires (same pattern as p2753): restore the loader and evict
// every module built against the fake zigbee-clusters so later suites in the same mocha run are untouched.
const cacheBefore = new Set(Object.keys(require.cache));
const originalLoad = Module._load;
Module._load = function loadWithHomeyMocks(request, parent, isMain) {
  if (request === 'homey') { return { Device: class {}, Driver: class {} }; }
  if (request === 'homey-zigbeedriver') {
    return {
      ZigBeeDevice: class { constructor() { this.log = () => {}; this.error = () => {}; } },
      ZigBeeDriver: class {},
    };
  }
  if (request === 'zigbee-clusters') {
    return {
      Cluster: class {},
      ZCLDataTypes: { uint8: 0x20, uint16: 0x21, uint32: 0x23, int8: 0x28, int16: 0x29, int32: 0x2b, enum8: 0x30, bitmap8: 0x18, buffer: 0x41, string: 0x42 },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const Device = require('../../drivers/water_valve_smart/device');
Module._load = originalLoad;
for (const k of Object.keys(require.cache)) { if (!cacheBefore.has(k)) { delete require.cache[k]; } }

function fake(mfr) {
  const d = Object.create(Device.prototype);
  d.getSetting = (k) => (k === 'zb_manufacturer_name' ? mfr : null);
  d.getData = () => ({});
  return d;
}

describe('P2864 Zemismart 214C DP map', () => {
  for (const mfr of ['_TZE284_vuwtqx0t', '_TZE200_vuwtqx0t', '_tze284_VUWTQX0T']) {
    it(`${mfr}: DP1 = meter_water, DP13 = valve, DP22 = temp/100, DP26 = battery`, () => {
      const m = fake(mfr).dpMappings;
      assert.equal(m[1].capability, 'meter_water');
      assert.equal(m[1].divisor, 1000);
      assert.equal(m[13].capability, 'onoff');
      assert.equal(m[13].transform(true), true);
      assert.equal(m[13].transform(false), false);
      assert.equal(m[22].capability, 'measure_temperature');
      assert.equal(m[22].divisor, 100);
      assert.equal(m[26].capability, 'measure_battery');
      assert.equal(m[26].transform(360), 100);   // 3.6 V
      assert.equal(m[26].transform(280), 0);     // 2.8 V
      assert.equal(m[26].transform(310), 50);    // 3.1 V
      assert.equal(m[26].transform('x'), null);
      assert.equal(m[5].capability, null, 'fault bitmask is not a leak alarm');
      assert.equal(m[21].internal, 'flow_rate');
    });
  }

  it('other valves keep their previous maps (additive)', () => {
    const generic = fake('_TZE200_unknownvalve').dpMappings;
    assert.equal(generic[1].capability, 'onoff');
    const frank = fake('_TZE200_nbqnmkee').dpMappings;
    assert.equal(frank[1].capability, 'onoff');
    assert.equal(frank[22].capability, 'measure_temperature');
    const garden = fake('_TZE200_sh1btabb').dpMappings;
    assert.equal(garden[1].capability, 'onoff');
    assert.equal(garden[5].capability, 'meter_water');
  });

  it('valve TX goes to DP13, never DP1 (source guard)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/water_valve_smart/device.js'), 'utf8');
    assert.ok(/isZemismart214c\)\s*\{[\s\S]{0,400}sendEf00DpMaxFallback\(this, 13, Boolean\(value\), 'bool'\)/.test(src));
  });

  it('compose couple unchanged (one couple, one driver)', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/water_valve_smart/driver.compose.json'), 'utf8'));
    const mfrs = (c.zigbee.manufacturerName || []).map((x) => x.toLowerCase());
    assert.ok(mfrs.includes('_tze284_vuwtqx0t') && mfrs.includes('_tze200_vuwtqx0t'));
  });
});
