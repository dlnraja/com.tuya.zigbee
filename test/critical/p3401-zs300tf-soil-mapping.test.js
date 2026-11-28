'use strict';

/**
 * P3401 (forum 140352 #2278/#2279, 3x ZS-301Z `_TZE284_hdml1aav`): temperature correct, then
 * 0 / 0.1 C; luminance always null. Z2M tuya.ts ZS-300TF: DP5 = temperature /10,
 * DP102 = illuminance, DP111 = water warning, DP112 = fertility (EC), DP115/116 = fertility
 * threshold / warning (they leaked into the universal auto-temp guess).
 */
require('../_support/homey-stub');
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');

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

function withParentSpy(d, fn) {
  const reached = [];
  const Parent = Object.getPrototypeOf(Object.getPrototypeOf(d));
  const orig = Parent._handleDP;
  Parent._handleDP = function (dp) { reached.push(Number(dp)); };
  try { fn(); } finally { Parent._handleDP = orig; }
  return reached;
}

const flush = () => new Promise((r) => setImmediate(r));

describe('P3401 ZS-300TF / ZS-301Z soil map (_TZE284_hdml1aav)', () => {
  it('profile is locked to the exact Z2M couples', () => {
    const P = require('../../lib/profiles/ZsSoil300TfProfile');
    assert.strictEqual(P.isZs300Tf('_TZE284_hdml1aav', 'TS0601'), true);
    assert.strictEqual(P.isZs300Tf('_TZE2841000000_hdml1aav', 'ts0601'), true);
    assert.strictEqual(P.isZs300Tf('_TZE284_hdml1aav', 'TS0201'), false);
    assert.strictEqual(P.isZs300Tf('_TZE200_hdml1aav', 'TS0601'), false, 'not in the Z2M fingerprint');
    assert.strictEqual(P.isZs300Tf('_TZE284_oitavov2', 'TS0601'), false);
  });

  it('replays the forum frames: temperature stays, illuminance fills, no auto-temp leak', async () => {
    const { d, caps, store } = fakeSoil('_TZE284_hdml1aav');
    const reached = withParentSpy(d, () => {
      d._handleDP(5, 185);
      d._handleDP(3, 55);
      d._handleDP(101, 71);
      d._handleDP(102, 850);
      d._handleDP(112, 450);
      d._handleDP(111, 0);
      d._handleDP(107, 0);
      d._handleDP(116, 0);
      d._handleDP(115, 1);
      d._handleDP(1, 0);
      d._handleDP(15, 90);
    });
    await flush();
    assert.strictEqual(caps.measure_temperature, 18.5, 'DP5 tenths, not overwritten by 0 / 0.1');
    assert.strictEqual(caps.measure_luminance, 850, 'DP102 is illuminance on this couple');
    assert.strictEqual(caps['measure_humidity.soil'], 55, 'DP107 calibration is not soil moisture');
    assert.strictEqual(caps.measure_humidity, 71);
    assert.strictEqual(caps.measure_ec, 450);
    assert.strictEqual(caps.alarm_water, false, 'DP111 water warning drives alarm_water');
    assert.deepStrictEqual(reached, [15], 'only the battery DP reaches the generic path');
    assert.strictEqual(store.device_reported.zs300tf_soil_fertility_warning, 'none');
    assert.strictEqual(store.device_reported.zs300tf_temperature_calibration, 0);
  });

  it('a low real temperature in tenths is not shown x10', async () => {
    const { d, caps } = fakeSoil('_TZE284_hdml1aav');
    withParentSpy(d, () => { d._handleDP(5, 85); });
    await flush();
    assert.strictEqual(caps.measure_temperature, 8.5);
  });

  it('other soil couples keep their previous path (no regression)', async () => {
    const { d, caps } = fakeSoil('_TZE200_somegeneric');
    const reached = withParentSpy(d, () => {
      d._handleDP(5, 21);
      d._handleDP(102, 850);
      d._handleDP(116, 0);
    });
    await flush();
    assert.strictEqual(caps.measure_temperature, 21);
    assert.strictEqual(caps.measure_luminance, undefined, 'generic DP102 stays a calibration echo');
    assert.deepStrictEqual(reached, [116], 'unknown DPs still reach the generic path elsewhere');
  });
});
