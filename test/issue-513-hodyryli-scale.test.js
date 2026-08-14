'use strict';

/**
 * GH #513 — ZT08 / _TZE284_hodyryli scale + battery_state enum
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { ProductValueValidator } = require('../lib/ProductValueValidator');
const EnrichedDPMappings = require('../lib/tuya/EnrichedDPMappings');
const { ClimateInference } = require('../lib/IntelligentSensorInference');

const MFR = '_TZE284_hodyryli';

describe('GH #513 ZT08 scale', () => {
  it('maps hodyryli to ZT08 profile (DP3 battery_state, DP38 probe)', () => {
    const profile = EnrichedDPMappings.getProfile(MFR);
    assert.ok(profile);
    assert.strictEqual(profile.type, 'climate');
    assert.strictEqual(profile.profile[3].converter, 'batteryState');
    assert.strictEqual(profile.profile[38].capability, 'measure_temperature.probe');
  });

  it('battery_state enum 0/1/2 → 10/50/100', () => {
    assert.strictEqual(EnrichedDPMappings.parseDP(MFR, 3, 0).value, 10);
    assert.strictEqual(EnrichedDPMappings.parseDP(MFR, 3, 1).value, 50);
    assert.strictEqual(EnrichedDPMappings.parseDP(MFR, 3, 2).value, 100);
  });

  it('does not treat enum 2 as 2% battery', () => {
    const parsed = EnrichedDPMappings.parseDP(MFR, 3, 2);
    assert.notStrictEqual(parsed.value, 2);
  });

  it('humidity ×10 (530) is scaled by ClimateInference to 53', () => {
    const inf = new ClimateInference({ log() {} });
    assert.strictEqual(inf.validateHumidity(530), 53);
    assert.strictEqual(inf.validateHumidity(45), 45);
  });

  it('learned divisor is not re-applied to already-scaled 53°C', () => {
    const v = ProductValueValidator.createDeviceValidator({ log() {} }, 'climate_sensor');
    v.learnedDivisors['measure_temperature.probe'] = 10;
    const r = v.validate(53, 'measure_temperature.probe');
    assert.strictEqual(r.correctedValue, 53);
    assert.strictEqual(r.correction, null);
  });
});
