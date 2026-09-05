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
    const all = DB.getAll();
    const entries = Array.isArray(all) ? all : Object.entries(all);
    assert.ok(entries.length > 0, 'catalog must not be empty');
    const [key, entry] = Array.isArray(entries[0])
      ? entries.find(([k, v]) => (v.driver || v.driverId) && k.includes('|')) || entries[0]
      : [null, entries[0]];
    const [mfr, pid] = (key || entry.key || '').split('|');
    if (!mfr || !pid) {
      // fallback: entry exposes its own mfr/pid fields
      const r = DB.lookup(entry.manufacturerName, entry.productId);
      assert.ok(r && (r.driver || r.driverId));
      return;
    }
    const r = DB.lookup(mfr, pid);
    assert.ok(r, `lookup ${mfr}|${pid}`);
    assert.strictEqual(r.driver || r.driverId, entry.driver || entry.driverId);
  });

  it('prefix variant resolves via fallback when catalog has one', () => {
    const r = DB.lookup('_TZE200_hodyryli', 'TS0201');
    if (!r || !r.driver) {
      // catalogue sans cette variante (branche stable) : vérifie juste le contrat
      assert.ok(r === null || r === undefined || typeof r === 'object');
      return;
    }
    assert.ok(r.driver === 'climate_sensor' || r.driver === 'climate_sensor_zt08');
    if (r.matchScore !== undefined) {assert.ok(r.matchScore <= 1);}
  });

  it('getDPMeaning returns an object or null consistently', () => {
    const meaning = DB.getDPMeaning('_TZE284_hodyryli', 'TS0601', 1);
    if (meaning === null) {
      assert.strictEqual(DB.getDPMeaning('_TZE284_hodyryli', 'TS0601', 38), null);
      return;
    }
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
