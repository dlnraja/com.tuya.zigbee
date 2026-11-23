'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const {
  chooseDivisor,
  scaleTemperature,
  recordSample,
  learnedDivisor,
  LEARN_HITS,
} = require('../lib/utils/TemperatureDivisorGuard');

describe('P3384 TemperatureDivisorGuard (forum 21313 #2782/#2786)', () => {
  it('scales raw 163 to 16.3 (bathroom radiator shown 10x too high)', () => {
    const r = scaleTemperature(163, { capability: 'measure_temperature' });
    assert.strictEqual(r.divisor, 10);
    assert.strictEqual(r.value, 16.3);
  });

  it('leaves an already-scaled 16.3 untouched', () => {
    const r = scaleTemperature(16.3, { capability: 'measure_temperature' });
    assert.strictEqual(r.divisor, 1);
    assert.strictEqual(r.value, 16.3);
    assert.strictEqual(r.reason, 'in-range');
  });

  it('does not apply a learned /10 to an already-scaled sample', () => {
    const r = chooseDivisor(21.5, { capability: 'measure_temperature', learned: 10 });
    assert.strictEqual(r.divisor, 1);
    assert.strictEqual(r.value, 21.5);
  });

  it('scales 2150 to 21.5 via /100 when /10 stays implausible', () => {
    const r = scaleTemperature(2150, { capability: 'measure_temperature' });
    assert.strictEqual(r.divisor, 100);
    assert.strictEqual(r.value, 21.5);
  });

  it('learns a divisor only after three consistent auto samples', () => {
    let store = {};
    for (let i = 0; i < LEARN_HITS; i++) {
      const r = scaleTemperature(163, { capability: 'measure_temperature' });
      store = recordSample(store, 'measure_temperature', r);
    }
    assert.strictEqual(learnedDivisor(store, 'measure_temperature'), 10);
  });

  it('rejects values that no bounded divisor can make plausible', () => {
    const r = scaleTemperature(99999, { capability: 'measure_temperature' });
    assert.strictEqual(r.value, null);
    assert.strictEqual(r.reason, 'implausible');
  });
});
