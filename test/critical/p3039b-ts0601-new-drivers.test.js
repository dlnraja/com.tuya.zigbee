'use strict';
// P3039b/c: nine new TS0601 drivers for devices that had no fitting driver (lead file
// data/leads/p3038c-ts0601-unmapped-2026-10-25.json). One upstream source each, exact DPs, exact TS0601 couples,
// no 0xEF00 (61184) bound or declared at pairing, no DP written at pairing.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { decode, encode } = require('../../lib/tuya/TuyaDpProfileCodec');

const ROOT = path.resolve(__dirname, '../..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');

const DRIVERS = {
  gpo_double_light_mg_au03: { mfr: '_TZE200_4jvmbiph', dps: [136, 1, 2, 3, 20, 21, 22, 23, 101] },
  gpo_double_mg_gpo02z: { dps: [136, 1, 2, 20, 21, 22, 23, 101] },
  keypad_alarm_wke502z: { dps: [3, 24] },
  wall_switch_rf_ews1154z: { dps: [19] },
  thermostat_vrf_bvrf_l001: { dps: [1, 2, 16, 24, 40, 49] },
  ufh_controller_pro_line_x10: { mfr: '_TZE204_rfpyqax9', dps: [33, 101, 108, 109, 110, 111] },
  ufh_controller_ch8z: { mfr: '_TZE284_1oft6qso', dps: [1, 8, 29] },
  energy_meter_3ch_bidirectional: { dps: [16, 1, 2, 9, 101, 102, 105, 108, 125, 130, 131] },
  smoke_sensor_ts0601_dp: { mfr: '_TZE200_yh7aoahi', dps: [1, 14, 15] },
};

describe('P3039b/c new TS0601 drivers', () => {
  const app = JSON.parse(read('app.json'));
  for (const [id, exp] of Object.entries(DRIVERS)) {
    describe(id, () => {
      const c = JSON.parse(read('drivers', id, 'driver.compose.json'));
      const dev = read('drivers', id, 'device.js');
      it('matches the exact TS0601 pid and the exact manufacturer forms', () => {
        assert.ok(c.zigbee.productId.includes('TS0601'));
        assert.ok(c.zigbee.manufacturerName.length >= 4);
        if (exp.mfr) { assert.ok(c.zigbee.manufacturerName.includes(exp.mfr), exp.mfr); }
      });
      it('declares and binds nothing on 0xEF00 at pairing', () => {
        for (const ep of Object.values(c.zigbee.endpoints || {})) {
          assert.ok(!(ep.clusters || []).includes(61184));
          assert.ok(!(ep.bindings || []).includes(61184));
        }
      });
      it('has one upstream source recorded', () => {
        assert.ok(c.metadata && /zigbee-herdsman-converters/.test(c.metadata.source));
      });
      it('maps the key DPs in the profile', () => {
        for (const dp of exp.dps) { assert.ok(new RegExp(`\\b${dp}\\s*:`).test(dev), `DP${dp} in ${id}`); }
      });
      it('writes no DP from onAdded / pairing hooks', () => {
        assert.ok(!/async onAdded\s*\([^)]*\)\s*\{[^}]*sendEf00/.test(dev));
      });
      it('is present in app.json with the exact couple', () => {
        const d = app.drivers.find((x) => x.id === id);
        assert.ok(d, 'in app.json');
        assert.ok(d.zigbee.productId.includes('TS0601'));
      });
    });
  }

  it('smoke_sensor3 keeps _TZE200_yh7aoahi (nothing removed)', () => {
    const c = JSON.parse(read('drivers', 'smoke_sensor3', 'driver.compose.json'));
    assert.ok(c.zigbee.manufacturerName.some((m) => m.toLowerCase() === '_tze200_yh7aoahi'));
  });
});

describe('P3039 codec kinds enum + delta', () => {
  const def = { kind: 'enum', map: { 0: 'cool', 1: 'heat', 2: 'fan_only' } };
  it('decodes known enum values and ignores unknown ones', () => {
    assert.strictEqual(decode(def, 1), 'heat');
    assert.strictEqual(decode(def, Buffer.from([2])), 'fan_only');
    assert.strictEqual(decode(def, 9), null);
  });
  it('encodes by reverse lookup and refuses unmapped ids', () => {
    assert.deepStrictEqual(encode(def, 'cool'), { value: 0, type: 'enum' });
    assert.throws(() => encode(def, 'dry'), /enum_value_not_mapped/);
  });
  it('delta decodes as a scaled increment', () => {
    assert.strictEqual(decode({ kind: 'delta', divisor: 1000 }, 25), 0.025);
  });
  it('engine skips non-positive delta increments and adds positive ones', () => {
    const src = read('lib/devices/TuyaDpProfileDevice.js');
    assert.ok(/def\.kind === 'delta'/.test(src) && /!\(v > 0\)/.test(src));
  });
});
