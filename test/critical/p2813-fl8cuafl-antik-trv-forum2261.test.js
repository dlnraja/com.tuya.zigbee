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

  it('fl8cuafl rides the SOFT me167 map only (P2818 #2261 ANTIK retail TV02-class, supersedes the P2813 "Profile A" default)', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers', 'device_radiator_valve', 'device.js'),
      'utf8',
    );
    const tails = src.match(/me167Tails\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(tails, 'me167Tails missing');
    // WHY(P2818, 3fe6c51bca): deliberate later decision, documented at the tail entry: soft ME167 DP4/5 /10 until a user DP sniff
    // proves otherwise. Guard that it stays an explicitly documented soft entry, not a silent one.
    assert.ok(/fl8cuafl/i.test(tails[1]), 'fl8cuafl soft ME167 entry (P2818) missing');
    assert.ok(/WHY\(P2818/.test(src), 'P2818 rationale comment missing');
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
