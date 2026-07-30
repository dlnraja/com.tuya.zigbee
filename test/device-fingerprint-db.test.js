'use strict';

/**
 * Tests — DeviceFingerprintDB (v9.0.368)
 * Contract of the fingerprint routing database:
 *  - exact mfr+pid lookups hit the right driver
 *  - prefix variants (TZE200/204/284 families) resolve via fallback
 *  - getDPMeaning returns known datapoint semantics
 *  - no entry points at a nonexistent driver directory
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const DB = require('../lib/DeviceFingerprintDB');

describe('DeviceFingerprintDB', () => {
  it('has a sane catalog', () => {
    const stats = DB.getStats();
    assert.ok(stats.exactEntries > 50, `exactEntries=${stats.exactEntries}`);
    assert.ok(stats.productIdDefaults > 10);
  });

  it('exact lookup hits the right driver', () => {
    const r = DB.lookup('_TZE284_hodyryli', 'TS0601');
    assert.strictEqual(r.driver, 'climate_sensor');
    assert.strictEqual(r.protocol, 'tuya_dp');
  });

  it('prefix variant resolves via fallback (TZE200 ↔ TZE284)', () => {
    const r = DB.lookup('_TZE200_hodyryli', 'TS0201');
    assert.ok(r && r.driver, 'should resolve');
    assert.strictEqual(r.driver, 'climate_sensor');
    assert.ok(r.matchScore <= 1);
  });

  it('getDPMeaning knows climate DPs', () => {
    const meaning = DB.getDPMeaning('_TZE284_hodyryli', 'TS0601', 1);
    assert.ok(meaning, 'DP1 should have a meaning');
    assert.match(String(meaning.capability), /temperature/i);
  });

  it('every exact entry points at a real driver directory', () => {
    const all = DB.getAll();
    const entries = Array.isArray(all) ? all : Object.entries(all);
    const ghosts = [];
    for (const e of entries) {
      const driver = Array.isArray(e) ? (e[1].driver || e[1].driverId) : (e.driver || e.driverId);
      if (!driver) {continue;}
      if (!fs.existsSync(path.join(ROOT, 'drivers', driver, 'driver.compose.json'))) {
        ghosts.push(driver);
      }
    }
    assert.deepStrictEqual([...new Set(ghosts)], [], 'drivers inexistants');
  });

  it('hasCollision is boolean and consistent', () => {
    assert.strictEqual(typeof DB.hasCollision('_TZE284_hodyryli', 'TS0601'), 'boolean');
  });
});
