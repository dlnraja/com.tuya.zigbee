'use strict';
// P3228: zero-parasite packing step 3b — climate_sensor_2 continuation, held + folded back (zero lost couples).
require('../_support/homey-stub'); // stub the SDK before homey-zigbeedriver loads
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DC = require('../../lib/drivers/DriverContinuations');
const { foldHeldContinuations, effectiveHoldIds } = require('../../scripts/publish-hold-release');

describe('P3228 climate_sensor continuation', () => {
  const rootC = require('../../drivers/climate_sensor/driver.compose.json');
  const contC = require('../../drivers/climate_sensor_2/driver.compose.json');

  it('registry chains climate_sensor -> climate_sensor_2', () => {
    DC.clearCache();
    const reg = DC.load(ROOT);
    assert.strictEqual(reg.rootOf('climate_sensor_2'), 'climate_sensor');
    assert.strictEqual(reg.firstNonFull('climate_sensor'), 'climate_sensor_2');
    assert.ok(reg.isSameLogical('climate_sensor', 'climate_sensor_2'));
  });

  it('continuation reuses the root classes and capabilities', () => {
    assert.strictEqual(require('../../drivers/climate_sensor_2/device'), require('../../drivers/climate_sensor/device'));
    assert.strictEqual(require('../../drivers/climate_sensor_2/driver'), require('../../drivers/climate_sensor/driver'));
    assert.deepStrictEqual(contC.capabilities, rootC.capabilities);
    assert.strictEqual(contC.class, rootC.class);
  });

  it('continuation carries TS0601 only and no mfr sits on both drivers', () => {
    assert.deepStrictEqual(contC.zigbee.productId.map((p) => p.toLowerCase()).filter((p, i, a) => a.indexOf(p) === i), ['ts0601']);
    const r = new Set(rootC.zigbee.manufacturerName.map((m) => m.toLowerCase()));
    assert.ok(contC.zigbee.manufacturerName.length > 0);
    for (const m of contC.zigbee.manufacturerName) assert.ok(!r.has(m.toLowerCase()), m);
  });

  it('climate_sensor_2 is held for publish', () => {
    const { ids } = effectiveHoldIds(require('../../config/publish-hold-drivers.json'), '');
    assert.ok(ids.has('climate_sensor_2'));
  });

  it('foldHeldContinuations merges exact lists into the root and drops the held driver', () => {
    const reg = DC.fromObject({ drivers: { a: { full: true, continuation: 'a_2' }, a_2: { continuationOf: 'a', index: 2 } } });
    const m = { drivers: [
      { id: 'a', zigbee: { manufacturerName: ['_X', '_y'], productId: ['TS0201', 'TS0601'] } },
      { id: 'a_2', zigbee: { manufacturerName: ['_Z', '_y'], productId: ['TS0601'] } },
      { id: 'b', zigbee: { manufacturerName: ['_Q'], productId: ['TS0001'] } },
    ] };
    assert.strictEqual(foldHeldContinuations(m, new Set(['a_2']), reg), 1);
    assert.deepStrictEqual(m.drivers.map((d) => d.id), ['a', 'b']);
    assert.deepStrictEqual(m.drivers[0].zigbee.manufacturerName, ['_X', '_y', '_Z']);
    assert.deepStrictEqual(m.drivers[0].zigbee.productId, ['TS0201', 'TS0601']);
    assert.strictEqual(foldHeldContinuations(m, new Set(['b']), reg), 0);
  });
});
