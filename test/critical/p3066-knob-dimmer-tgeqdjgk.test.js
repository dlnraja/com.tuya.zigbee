'use strict';
// P3066: _TZE200/_TZE284_tgeqdjgk = Z2M tuya.ts TS0601_knob_dimmer_switch: DP102 state, DP103 brightness 0-1000,
// DP107 colour temperature 0-1000 (light_temperature added late, after the first report).
require('../_support/homey-stub').install();
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const Device = require(path.join(ROOT, 'drivers/wall_dimmer_tuya/device.js'));

function fake(mfr) {
  const caps = new Set(['onoff', 'dim']);
  const set = {};
  const writes = [];
  const listeners = {};
  const d = Object.create(Device.prototype);
  Object.assign(d, {
    getSetting: (k) => k === 'zb_manufacturer_name' ? mfr : null,
    getData: () => ({}), log: () => {}, error: () => {},
    hasCapability: (c) => caps.has(c),
    addCapability: async (c) => { caps.add(c); },
    safeSetCapabilityValue: async (c, v) => { set[c] = v; },
    registerCapabilityListener: (c, fn) => { listeners[c] = fn; },
    writeData32: async (dp, v) => { writes.push([dp, v]); return true; },
  });
  return { d, set, caps, writes, listeners };
}
const tick = () => new Promise((r) => setTimeout(r, 5));

describe('P3066 knob dimmer tgeqdjgk', () => {
  it('uses DP102/DP103 for TX, other couples keep V1', () => {
    assert.strictEqual(fake('_TZE284_tgeqdjgk').d._dimmerDpMap().onoff.dp, 102);
    assert.strictEqual(fake('_TZE200_tgeqdjgk').d._dimmerDpMap().dim.dp, 103);
    assert.notStrictEqual(fake('_TZE200_3p5ydos3').d._dimmerDpMap().onoff.dp, 102);
  });
  it('RX: state, brightness, and colour temperature added on the first DP107 report', async () => {
    const { d, set, caps, writes, listeners } = fake('_TZE284_tgeqdjgk');
    assert.strictEqual(d._processLayoutDp(102, true), true);
    assert.strictEqual(d._processLayoutDp(103, 500), true);
    assert.ok(!caps.has('light_temperature'));
    d._processLayoutDp(107, 250);
    await tick();
    assert.deepStrictEqual([set.onoff, set.dim, set.light_temperature], [true, 0.5, 0.25]);
    assert.ok(caps.has('light_temperature'));
    await listeners.light_temperature(1);
    assert.deepStrictEqual(writes, [[107, 1000]]);
  });
  it('a V1 dimmer ignores the knob layout', () => {
    assert.strictEqual(fake('_TZE200_3p5ydos3').d._processLayoutDp(102, true), false);
  });
});
