'use strict';
/* eslint-env mocha */
// P3064 energy family: Moes ZM7LT3 (_TZE284_cf4b5ktf) per-couple DP map + 18-byte phase struct.
// Source: zigbee-herdsman-converters src/devices/moes.ts (facts only).
const assert = require('assert');
const Module = require('module');

// WHY: load the driver with a stub 'homey' module, then restore the loader (no leak into other tests).
function loadDev() {
  const orig = Module._load;
  Module._load = function (r, ...a) {
    if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
    return orig.call(this, r, ...a);
  };
  try {
    const p = require.resolve('../drivers/energy_meter_3phase/device');
    delete require.cache[p];
    return require(p);
  } finally { Module._load = orig; }
}
const Dev = loadDev();

function fake(mfr) {
  const d = Object.create(Dev.prototype);
  const caps = {};
  d.getSetting = (k) => k === 'zb_manufacturer_name' ? mfr : undefined;
  d.log = () => {};
  d.hasCapability = () => true;
  d.getCapabilityValue = (c) => caps[c];
  d.safeSetCapabilityValue = (c, v) => { if (c) { caps[c] = v; } return Promise.resolve(); };
  d.getData = () => ({ id: 't' });
  d._caps = caps;
  return d;
}
// 18 bytes: v2, len 0x0f, 230.0 V, 1.500 A, 345 W, 10 var, 350 VA, PF 0.98, flags 0
const phase = (w, flags = 0) => Buffer.from([0x02, 0x0f, 0x08, 0xfc, 0, 0x05, 0xdc, (w >> 16) & 255, (w >> 8) & 255, w & 255, 0, 0, 10, 0, 0x01, 0x5e, 98, flags]);

describe('P3064 Moes ZM7LT3 three-phase meter', () => {
  it('only the two exact couples take the Moes map (case-insensitive)', () => {
    assert.strictEqual(Dev.isMoesZm7lt3('_TZE284_cf4b5ktf'), true);
    assert.strictEqual(Dev.isMoesZm7lt3('_tze28c1000000_cf4b5ktf'), true);
    assert.strictEqual(Dev.isMoesZm7lt3('_TZE284_ves1ycwx'), false);
  });
  it('maps DP1/2/9 and keeps 47-53 internal', () => {
    const m = fake('_TZE284_cf4b5ktf').dpMappings;
    assert.strictEqual(m[1].capability, 'meter_power'); assert.strictEqual(m[1].divisor, 100);
    assert.strictEqual(m[2].capability, 'meter_power.exported');
    assert.strictEqual(m[9].capability, 'measure_power');
    for (const dp of [6, 7, 8, 10, 47, 48, 49, 51, 53]) { assert.strictEqual(m[dp].capability, null, `DP${dp}`); }
  });
  it('other 3-phase meters keep their previous map (additive)', () => {
    const m = fake('_TZE200_bcusnqt8').dpMappings;
    assert.strictEqual(m[29].capability, 'measure_power');
    assert.strictEqual(m[9], undefined);
  });
  it('decodes phase structs, sums until DP9, then DP9 wins', () => {
    const d = fake('_TZE284_cf4b5ktf');
    d._handleDP(6, phase(345));
    d._handleDP(7, phase(100, 0x02));
    assert.strictEqual(d._caps['measure_power.phase1'], 345);
    assert.strictEqual(d._caps['measure_power.phase2'], -100);
    assert.strictEqual(d._caps.measure_voltage, 230);
    assert.strictEqual(d._caps.measure_current, 1.5);
    assert.strictEqual(d._caps.measure_power, 245);
    d._handleDP(9, 1234);
    assert.strictEqual(d._caps.measure_power, 1234);
    assert.strictEqual(d._caps['measure_power.phase_total'], 1234);
    d._handleDP(8, phase(50));
    assert.strictEqual(d._caps.measure_power, 1234);
  });
  it('ignores a malformed phase payload', () => {
    const d = fake('_TZE284_cf4b5ktf');
    d._handleDP(6, Buffer.from([1, 2]));
    assert.strictEqual(d._caps['measure_power.phase1'], undefined);
  });
});
