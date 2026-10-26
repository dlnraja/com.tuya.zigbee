'use strict';
// P3066: _TZE284_6ycgarab is the Tuya TS0601 dual smoke + CO alarm (Z2M TS0601_smoke_co). Its only
// TS0601 owner is smoke_sensor; the fingerprint hint pointed at smoke_detector_advanced, a driver that
// does not list it. The hint (monolith + runtime shard) now names the real owner. Pairing is unchanged.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

describe('P3066 _TZE284_6ycgarab fingerprint hint', () => {
  it('hint names the TS0601 compose owner in monolith and shard', () => {
    const fp = require(path.join(ROOT, 'lib/tuya/fingerprints.json'));
    const shard = require(path.join(ROOT, 'lib/tuya/fp-shards/TZE284_6.json'));
    for (const db of [fp, shard]) {
      assert.strictEqual(db._TZE284_6ycgarab.driverId, 'smoke_sensor');
      assert.deepStrictEqual(db._TZE284_6ycgarab.modelIds, ['TS0601']);
    }
    const owner = require(path.join(ROOT, 'drivers/smoke_sensor/driver.compose.json')).zigbee;
    assert.ok(owner.manufacturerName.includes('_TZE284_6ycgarab'));
    assert.ok(owner.productId.includes('TS0601'));
  });
});
