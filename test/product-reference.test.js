'use strict';

/**
 * Tests — product reference DB + energy estimation (v9.0.375)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');

describe('product reference DB', () => {
  const db = require(path.join(ROOT, 'data', 'product-reference.json'));

  it('covers the fingerprint catalog', () => {
    assert.ok(db.count > 5000, `count=${db.count}`);
  });

  it('resolves driver and battery info for known devices', () => {
    const h = db.reference['_TZE284_hodyryli'];
    assert.ok(h, 'hodyryli must exist');
    assert.strictEqual(h.driverId, 'climate_sensor');
    assert.ok(h.batteries.length > 0, 'battery types present');
  });

  it('links blakadder product pages and image candidates', () => {
    const withImg = Object.values(db.reference).filter(e => e.imageCandidates?.length);
    assert.ok(withImg.length > 1000, `withImg=${withImg.length}`);
    const withPage = Object.values(db.reference).filter(e => e.productPage);
    assert.ok(withPage.length > 1000, `withPage=${withPage.length}`);
  });

  it('groups variants of the same product', () => {
    const withVariants = Object.values(db.reference).filter(e => e.variants?.length);
    assert.ok(withVariants.length > 100, `withVariants=${withVariants.length}`);
  });

  it('every reference driverId exists', () => {
    const missing = new Set();
    for (const [mfr, e] of Object.entries(db.reference)) {
      if (e.driverId && !fs.existsSync(path.join(ROOT, 'drivers', e.driverId, 'driver.compose.json'))) {
        missing.add(`${mfr}→${e.driverId}`);
      }
    }
    assert.deepStrictEqual([...missing], [], [...missing].slice(0, 5).join(', '));
  });
});

describe('energy consumption reference', () => {
  const ref = require(path.join(ROOT, 'data', 'energy-consumption-reference.json'));

  it('has sane class and driver defaults', () => {
    assert.ok(ref.classes.light.nominalW > 0);
    assert.ok(ref.drivers.plug.standbyW >= 0);
    assert.ok(Object.keys(ref.drivers).length > 30);
  });

  it('telemetry condition card exists in the manifest flow', () => {
    const app = require(path.join(ROOT, 'app.json'));
    const cond = (app.flow?.conditions || []).find(c => c.id === 'telemetry_is_estimated');
    assert.ok(cond, 'telemetry_is_estimated must be in app.json flow conditions');
  });
});
