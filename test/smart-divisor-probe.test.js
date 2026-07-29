'use strict';

/**
 * Regression test — GitHub issue #513
 * Climate sensor _TZE284_hodyryli: external probe temperature (DP38,
 * capability measure_temperature.probe) was displayed 10x too low.
 *
 * Root cause: SmartDivisorManager had no CAP_TYPES/VALID_RANGES entry for
 * 'measure_temperature.probe', so smartParse divided by 1 and the raw x10
 * value (e.g. 215) reached ProductValueValidator, which "auto-corrected"
 * it with divisor 100 -> 2.15 instead of 10 -> 21.5.
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  smartParse,
  clearDivisorCache,
  VALID_RANGES,
} = require('../lib/managers/SmartDivisorManager');
const { ProductValueValidator } = require('../lib/ProductValueValidator');

const MFR = '_TZE284_hodyryli';

describe('SmartDivisorManager — measure_temperature.probe (issue #513)', () => {
  it('has a valid range for measure_temperature.probe', () => {
    assert.ok(VALID_RANGES['measure_temperature.probe']);
  });

  it('divides raw x10 probe values by 10 (DP38, _TZE284_hodyryli)', () => {
    clearDivisorCache();
    const val = smartParse(215, 38, {
      manufacturerName: MFR,
      capability: 'measure_temperature.probe',
      deviceId: 'test-probe',
    });
    assert.strictEqual(val, 21.5);
  });

  it('handles negative probe temperatures', () => {
    clearDivisorCache();
    const val = smartParse(-53, 38, {
      manufacturerName: MFR,
      capability: 'measure_temperature.probe',
      deviceId: 'test-probe-neg',
    });
    assert.strictEqual(val, -5.3);
  });

  it('validator leaves the scaled probe value untouched', () => {
    const result = ProductValueValidator.validateAndCorrect(
      21.5, 'measure_temperature.probe', 'climate_sensor'
    );
    assert.strictEqual(result.correctedValue, 21.5);
    assert.strictEqual(result.correction, null);
  });

  it('does not regress internal temperature (DP1)', () => {
    clearDivisorCache();
    const val = smartParse(215, 1, {
      manufacturerName: MFR,
      capability: 'measure_temperature',
      deviceId: 'test-internal',
    });
    assert.strictEqual(val, 21.5);
  });
});
