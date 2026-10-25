'use strict';

/**
 * P3051 — per-device cross-check (Z2M herdsman-converters + ZHA quirks).
 * 1) GH#576 BSEED TS0601 curtain switch (Z2M bseed.ts BSEED_TS0601_cover, ZHA ts0601_cover.py):
 *    DP3 is the arrived position and DP105 the motor speed — never `dim` nor a button press.
 * 2) `_TZE204_ogkdpgy2` CO2 (ZHA tuya_co.py): optional DP18 temperature struct + DP19 humidity /10,
 *    learned on first report only; the `_TZE200_` sibling stays CO2-only (Z2M).
 */

const { describe, it } = require('../_support/dual-runner'); // P3020
const assert = require('node:assert/strict');
const Module = require('module');

const cacheBefore = new Set(Object.keys(require.cache));
const originalLoad = Module._load;
Module._load = function loadWithHomeyMocks(request, parent, isMain) {
  if (request === 'homey') { return { Device: class {}, Driver: class {}, App: class {} }; }
  if (request === 'homey-zigbeedriver') {
    return {
      ZigBeeDevice: class { constructor() { this.log = () => {}; this.error = () => {}; } },
      ZigBeeDriver: class {},
      debug: () => {},
    };
  }
  if (request === 'zigbee-clusters') {
    const C = class { static addCluster() {} };
    return {
      Cluster: C, BoundCluster: class {}, CLUSTER: {},
      ZCLDataTypes: { uint8: 0x20, uint16: 0x21, uint32: 0x23, int8: 0x28, int16: 0x29, int32: 0x2b, enum8: 0x30, bitmap8: 0x18, buffer: 0x41, string: 0x42 },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const Cover = require('../../drivers/curtain_motor/device');
const Co2 = require('../../drivers/air_quality_co2/device');
Module._load = originalLoad;
for (const k of Object.keys(require.cache)) { if (!cacheBefore.has(k)) { delete require.cache[k]; } }

function fake(Klass, mfr, pid = 'TS0601') {
  const d = Object.create(Klass.prototype);
  const store = {};
  d.getManufacturerName = () => mfr;
  d.getSetting = (k) => k === 'zb_manufacturer_name' ? mfr : k === 'zb_model_id' ? pid : null;
  d.getData = () => ({});
  d.getStoreValue = (k) => store[k];
  d.setStoreValue = async (k, v) => { store[k] = v; };
  d._validateCO2 = (v) => v;
  d.hasCapability = () => false;
  d._store = store;
  return d;
}

describe('P3051 BSEED TS0601 curtain switch (GH#576)', () => {
  for (const mfr of ['_TZE200_yenbr4om', '_TZE200_bdblidq3', '_TZE204_bdblidq3']) {
    it(`${mfr}: DP1 state, DP2/DP3 position, DP105 internal speed`, () => {
      const m = fake(Cover, mfr).dpMappings;
      assert.equal(m[1].capability, 'windowcoverings_state');
      assert.equal(m[1].transform(0), 'up');
      assert.equal(m[1].transform(1), 'idle');
      assert.equal(m[1].transform(2), 'down');
      assert.equal(m[2].capability, 'windowcoverings_set');
      assert.equal(m[3].capability, 'windowcoverings_set');
      assert.equal(m[3].transform(40), 0.4);
      assert.equal(m[105].capability, null);
      assert.equal(m[105].internal, 'motor_speed');
      assert.ok(!Object.values(m).some((x) => x.capability === 'dim' || x.handler === '_handleButtonPress'));
    });
  }
  it('substring / other pid does not enable the profile', () => {
    assert.equal(fake(Cover, '_TZE200_yenbr4omX')._isBseedCurtainSwitch(), false);
    assert.equal(fake(Cover, '_TZE200_yenbr4om', 'TS130F')._isBseedCurtainSwitch(), false);
    assert.equal(fake(Cover, '_TZE200_abcdefgh').dpMappings[3].capability, 'dim');
  });
});

describe('P3051 _TZE204_ogkdpgy2 optional climate DPs (ZHA tuya_co.py)', () => {
  it('decodes the DP18 struct (int16 BE in bytes 2..3, tenths of degC)', () => {
    const { decodeOgkdpgy2Temperature } = Co2;
    assert.equal(decodeOgkdpgy2Temperature(Buffer.from([0, 0, 0x00, 0xd7])), 21.5);
    assert.equal(decodeOgkdpgy2Temperature(Buffer.from([0, 1, 0xff, 0xf6])), -1);
    assert.equal(decodeOgkdpgy2Temperature(0x000100d7), 21.5);
    assert.equal(decodeOgkdpgy2Temperature(Buffer.from([0x7f, 0xff])), null);
  });
  it('maps DP18/DP19 with dynamicAdd and remembers them', () => {
    const d = fake(Co2, '_TZE204_ogkdpgy2');
    const m = d.dpMappings;
    assert.equal(m[2].capability, 'measure_co2');
    assert.equal(m[18].capability, 'measure_temperature');
    assert.equal(m[18].dynamicAdd, true);
    assert.equal(m[18].transform(Buffer.from([0, 0, 0, 215])), 21.5);
    assert.equal(m[19].capability, 'measure_humidity');
    assert.equal(m[19].divisor, 10);
    assert.equal(m[19].transform(45.3), 45.3);
    assert.equal(m[19].transform(400), null);
    assert.deepEqual(d._store.p3051_co2_climate_caps.sort(), ['measure_humidity', 'measure_temperature']);
  });
  it('_TZE200_ogkdpgy2 stays CO2-only (Z2M)', () => {
    const m = fake(Co2, '_TZE200_ogkdpgy2').dpMappings;
    assert.deepEqual(Object.keys(m), ['2']);
  });
});
