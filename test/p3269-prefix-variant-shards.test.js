'use strict';

/**
 * P3269: lazy fingerprint shards (P3265) bucket by prefix. A _TYST11_ or
 * _TZE284_ report must still resolve through the prefix-variant heuristic,
 * which needs the _TZE200_ spelling's shard to be loaded first.
 */
const assert = require('assert');
const { describe, it, after } = require('./_support/dual-runner');
const path = require('path');

function freshDb({ pressure = false } = {}) {
  const lazy = require('../lib/performance/IntelligentLazyLoad');
  if (!lazy.__p3269RealPressure) {lazy.__p3269RealPressure = lazy.isMemoryPressure;}
  lazy.isMemoryPressure = pressure ? () => true : lazy.__p3269RealPressure;
  const dbPath = path.resolve(__dirname, '../lib/tuya/DeviceFingerprintDB.js');
  const matcherPath = path.resolve(__dirname, '../lib/utils/fingerprint-matcher.js');
  delete require.cache[dbPath];
  delete require.cache[matcherPath];
  return require(dbPath);
}

describe('P3269 prefix-variant lookup across lazy shards', function() {
  after(function() {
    const lazy = require('../lib/performance/IntelligentLazyLoad');
    if (lazy.__p3269RealPressure) {lazy.isMemoryPressure = lazy.__p3269RealPressure; delete lazy.__p3269RealPressure;}
  });

  it('after odd-form lookups like p3015: _TYST11_ alias still resolves to the _TZE284_ entry', function() {
    const db = freshDb({ pressure: true });
    // Same lookups p3015-caseless-kept-drivers runs first in the full suite.
    for (const id of ['_TZ3000_cjfmu5he', '_TZ3000_mq4wujmp', '_TZ3000_5af5r192', '_TZ3000_ogjpfoyn', '_TZ3000_kz1anoi8']) {
      for (const v of [id, id.toLowerCase(), id.toUpperCase(), `  ${id} `, `${id}\u0000`, `\uFEFF${id}`, `${id}\u200B`, `_\u200D${id.slice(1)}`]) {
        db.getFingerprint(v, 'TS0049');
      }
    }
    assert.strictEqual(db.getDriverId('_TYST11_sgabhwa6', 'TS0601'), 'soil_sensor');
  });

  it('under heap pressure: unknown suffix still returns null', function() {
    const db = freshDb({ pressure: true });
    assert.strictEqual(db.getFingerprint('_TYST11_zzzzzzzz', 'TS0601'), null);
  });

  it('cold DB: _TYST11_ alias resolves to the _TZE200_ driver (soil_sensor)', function() {
    const db = freshDb();
    assert.strictEqual(db.getDriverId('_TYST11_sgabhwa6', 'TS0601'), 'soil_sensor');
  });

  it('cold DB: unknown suffix still returns null (no false positive)', function() {
    const db = freshDb();
    assert.strictEqual(db.getFingerprint('_TYST11_zzzzzzzz', 'TS0601'), null);
  });

  it('heuristic sees keys from a shard loaded after the first lookup', function() {
    const db = freshDb();
    // First lookup builds the matcher index on a mostly-empty catalog.
    db.getFingerprint('_TZE200_zzzzzzzz', 'TS0601');
    const fp = db.getFingerprint('_TYST11_sgabhwa6', 'TS0601');
    assert.ok(fp, 'variant must resolve after other shards were indexed');
    assert.strictEqual(fp.driverId, 'soil_sensor');
  });
});
