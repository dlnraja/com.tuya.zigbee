'use strict';
// P3071: TS0601_din_1 / SPM01V1-GT in energy_meter_din and the *-GT phase structs in energy_meter_3phase
// (DP layouts from zigbee-herdsman-converters tuya.ts; own decoders).
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const Din = require(path.join(ROOT, 'drivers/energy_meter_din/device.js'));
const Tri = require(path.join(ROOT, 'drivers/energy_meter_3phase/device.js'));

function fake(Cls, mfr) {
  const set = {};
  const sent = [];
  const calls = [];
  const d = Object.create(Cls.prototype);
  Object.assign(d, {
    getSetting: (k) => k === 'zb_manufacturer_name' ? mfr : null,
    getStore: () => ({}), getData: () => ({}),
    hasCapability: () => true,
    getCapabilityValue: (c) => set[c],
    safeSetCapabilityValue: async (c, v) => { set[c] = v; },
    log: () => {},
    tuyaEF00Manager: { sendDP: async (dp, v, t) => { sent.push([dp, v, t]); } },
  });
  return { d, set, sent, calls };
}
const tick = () => new Promise((r) => setImmediate(r));
// SPM struct: 230.0 V, 1.500 A, 345 W
const SPM = Buffer.from([0x08, 0xfc, 0x00, 0x05, 0xdc, 0x00, 0x01, 0x59]);

describe('P3071 DIN_1 / SPM01V1-GT decode (energy_meter_din)', () => {
  it('din_1: DP1 energy, DP6 V/A from bytes 11-14, DP16 relay, DP103 W, DP105 Hz; onoff writes DP16', async () => {
    const { d, set, sent } = fake(Din, '_TZE200_bkkmqmyo');
    const b6 = Buffer.alloc(15); b6[11] = 0x01; b6[12] = 0xf4; b6[13] = 0x08; b6[14] = 0xfc;
    d._handleDP(1, 12345); d._handleDP(6, b6.toString('base64')); d._handleDP(16, true);
    d._handleDP(103, 120); d._handleDP(105, 5001);
    await tick();
    assert.deepStrictEqual(set, { meter_power: 123.45, measure_voltage: 230, measure_current: 0.5, onoff: true, measure_power: 120, measure_frequency: 50.01 });
    await d._setOnOff(false);
    assert.deepStrictEqual(sent, [[16, 0, 'bool']]);
  });
  it('SPM01V1-GT: DP1 energy, DP6 packed V/A/W, DP32 Hz; DP1 never toggles onoff', async () => {
    const { d, set } = fake(Din, '_TZE284_d2zfgtij');
    d._handleDP(1, 500); d._handleDP(6, SPM); d._handleDP(32, 4998);
    await tick();
    assert.deepStrictEqual(set, { meter_power: 5, measure_voltage: 230, measure_current: 1.5, measure_power: 345, measure_frequency: 49.98 });
  });
  it('short DP6 payloads are ignored, lsanae15 keeps its own path', async () => {
    assert.strictEqual(Din.decodeDin1Phase(Buffer.from([1, 2, 3])), null);
    const { d } = fake(Din, '_TZE204_lsanae15');
    assert.strictEqual(d._isDin2(), true);
  });
});

describe('P3071 *-GT phase structs (energy_meter_3phase)', () => {
  it('exact couples only', () => {
    for (const m of ['_TZE204_s4sa1mcx', '_TZE284_x8diwkqb', '_TZE284_a14rjslz', '_TZE200_d2zfgtij']) {assert.ok(Tri.isGtPhase(m), m);}
    assert.ok(!Tri.isGtPhase('_TZE204_ves1ycwx'));
    assert.ok(!Tri.isGtPhase('_TZE204_s4sa1mcxx'));
  });
  it('phase A sets V/A and phase power; the meter DP29 total wins once seen', async () => {
    const { d, set } = fake(Tri, '_TZE204_s4sa1mcx');
    d._handleDP(6, SPM);
    await tick();
    assert.strictEqual(set.measure_voltage, 230);
    assert.strictEqual(set.measure_current, 1.5);
    assert.strictEqual(set['measure_power.phase1'], 345);
    assert.strictEqual(set.measure_power, 345);
    d._dp29Seen = true; set.measure_power = 900;
    d._handleDP(7, SPM);
    await tick();
    assert.strictEqual(set['measure_power.phase2'], 345);
    assert.strictEqual(set.measure_power, 900);
  });
});
