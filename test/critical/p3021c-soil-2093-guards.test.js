'use strict';

/**
 * P3021c — forum #2093 (blutch32, diag 3690dfdb): replay of the real frame
 * DP3=55 DP5=129 DP15=70 DP14=enum1 DP9=enum0 from manufacturer A89G12C.
 */
require('../_support/homey-stub');
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const G = require('../../lib/sensors/SoilDpGuards');

function fakeSoil(mfr, pid = 'TS0601', store = {}) {
  const Dev = require('../../drivers/soil_sensor/device');
  const d = Object.create(Dev.prototype);
  const caps = {};
  d.log = () => {}; d.error = () => {};
  d.getSetting = (k) => {
    if (k === 'zb_manufacturer_name') {return mfr;}
    if (k === 'zb_model_id') {return pid;}
    return undefined;
  };
  d.getStoreValue = (k) => store[k];
  d.setStoreValue = async (k, v) => { store[k] = v; };
  d.getData = () => ({ productId: pid });
  d.setSettings = async () => {};
  d.hasCapability = () => true;
  d.getCapabilityValue = (c) => caps[c] ?? null;
  d.safeSetCapabilityValue = async (c, v) => { caps[c] = v; };
  d._triggerMoistureFlows = () => {}; d._triggerTemperatureFlows = () => {}; d._triggerECFlows = () => {};
  d._updateWaterAlarm = () => {};
  return { d, caps, store };
}

describe('P3021c SoilDpGuards (forum #2093)', () => {
  it('DP5: A89G12C starts in ÷10, generic learns ÷10 stickily and keeps raw °C otherwise', () => {
    const a = G.newState('A89G12C');
    assert.strictEqual(G.scaleDp5(129, a).value, 12.9);
    assert.strictEqual(G.scaleDp5(95, a).value, 9.5);
    const g = G.newState('_TZE200_myd45weu');
    assert.strictEqual(G.scaleDp5(22, g).value, 22, 'TS0601_soil raw °C untouched');
    const r = G.scaleDp5(215, g);
    assert.strictEqual(r.value, 21.5); assert.strictEqual(r.learned, true);
    assert.strictEqual(G.scaleDp5(95, g).value, 9.5, 'sticky after proof');
    assert.strictEqual(G.newState('x', { scale10: true }).scale10, true, 'reloaded from store');
  });

  it('DP14 enum skipped only while DP15 % is live; DP9 never mapped', () => {
    const s = G.newState('A89G12C');
    assert.strictEqual(G.guardAux(14, 1, s, 1000), null, 'no DP15 yet → keep state fallback');
    assert.strictEqual(G.guardAux(15, 70, s, 2000), null);
    assert.strictEqual(G.guardAux(14, 1, s, 3000).action, 'skip');
    assert.strictEqual(G.guardAux(14, 1, s, 2000 + G.DP15_FRESH_MS + 1), null, 'stale DP15 → fallback again');
    assert.strictEqual(G.guardAux(9, 0, s).action, 'skip');
    assert.strictEqual(G.guardAux(3, 55, s), null);
  });

  it('replays the blutch32 frame through soil_sensor._handleDP', () => {
    const { d, caps, store } = fakeSoil('A89G12C');
    // Parent DP path (battery handler) is out of scope here: record what reaches it.
    const reached = [];
    const Parent = Object.getPrototypeOf(Object.getPrototypeOf(d));
    const orig = Parent._handleDP;
    Parent._handleDP = function (dp, v) { reached.push([Number(dp), v]); };
    d._handleDP(3, 55);
    d._handleDP(5, 129);
    d._handleDP(15, 70);
    d._handleDP(14, 1);
    d._handleDP(9, 0);
    assert.strictEqual(caps['measure_humidity.soil'], 55);
    assert.strictEqual(caps.measure_temperature, 12.9, 'DP9 unit did not overwrite temperature with 0');
    d._handleDP(5, 95);
    assert.strictEqual(caps.measure_temperature, 9.5);
    assert.ok(caps.measure_battery === undefined || caps.measure_battery === 70, 'DP14 enum never wrote 50 %');
    assert.notStrictEqual(caps.measure_battery, 50);
    assert.ok(store.p3021c_soil_guard === undefined || store.p3021c_soil_guard.scale10 === true);
    Parent._handleDP = orig;
    assert.deepStrictEqual(reached.map((r) => r[0]), [15], 'only DP15 reaches the battery path; DP14/DP9 stopped');
  });

  it('generic soil learns ÷10 from the device and persists it', () => {
    const { d, caps, store } = fakeSoil('_TZE200_somegeneric');
    d._handleDP(5, 21);
    assert.strictEqual(caps.measure_temperature, 21);
    d._handleDP(5, 183);
    assert.strictEqual(caps.measure_temperature, 18.3);
    assert.deepStrictEqual(store.p3021c_soil_guard, { scale10: true });
    d._handleDP(5, 88);
    assert.strictEqual(caps.measure_temperature, 8.8);
  });
});
