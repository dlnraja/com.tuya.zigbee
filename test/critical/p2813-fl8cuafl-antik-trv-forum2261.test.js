'use strict';

/**
 * Contre quoi (forum #2261): `_TZE200_fl8cuafl`+TS0601 ANTIK ATK-TRV02 must pair as
 * `device_radiator_valve` — never virtual socket / plug. Profile A until Z2M DP proven.
 * Source: marosk Homey Dev Tools settings (exact mfr+pid).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2813 fl8cuafl ANTIK TRV02 → device_radiator_valve', () => {
  it('compose locks fl8cuafl TZE200/204/284 + TS0601 on device_radiator_valve', () => {
    const compose = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, 'drivers', 'device_radiator_valve', 'driver.compose.json'),
        'utf8',
      ),
    );
    const mfr = (compose.zigbee.manufacturerName || []).map(String);
    const pid = (compose.zigbee.productId || []).map(String);
    assert.ok(mfr.some((m) => /_TZE200_fl8cuafl/i.test(m)), 'TZE200 fl8cuafl missing');
    assert.ok(mfr.some((m) => /_TZE204_fl8cuafl/i.test(m)), 'TZE204 sibling missing');
    assert.ok(mfr.some((m) => /_TZE284_fl8cuafl/i.test(m)), 'TZE284 sibling missing');
    assert.ok(pid.some((p) => /^ts0601$/i.test(p)), 'TS0601 missing');
  });

  it('does not force fl8cuafl into me167Tails (Profile A default until proven)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers', 'device_radiator_valve', 'device.js'),
      'utf8',
    );
    const tails = src.match(/me167Tails\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(tails, 'me167Tails missing');
    assert.ok(!/fl8cuafl/i.test(tails[1]), 'do not invent me167 for fl8cuafl without Z2M proof');
  });

  it('registry pins canonical device_radiator_valve', () => {
    const reg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'data', 'user-misattribution-registry.json'), 'utf8'),
    );
    const entry = (reg.cases || []).find((e) => e.id === 'p2813-fl8cuafl-antik-trv02');
    assert.ok(entry, 'p2813 registry case missing');
    assert.equal(entry.canonicalDriver, 'device_radiator_valve');
    assert.ok((entry.productId || []).some((p) => /^ts0601$/i.test(String(p))));
  });
});
