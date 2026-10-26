'use strict';
// P3066 (bastien-home): the runtime reads lib/tuya/fp-shards (DeviceFingerprintDB); the EcoDim bulb hint
// must live in its shard as well as in the monolith.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

describe('P3066 bastien runtime fingerprint shard', () => {
  it('_TZ3210_09hzmirw shard hint is the CCT light driver', () => {
    const shard = require(path.join(ROOT, 'lib/tuya/fp-shards/TZ3210_0.json'));
    assert.strictEqual(shard._TZ3210_09hzmirw.driverId, 'light_cct_ts0502b');
    assert.deepStrictEqual(shard._TZ3210_09hzmirw.modelIds, ['TS0502B']);
  });
});
