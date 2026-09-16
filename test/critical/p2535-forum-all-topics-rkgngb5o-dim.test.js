'use strict';

/**
 * P2535 — Forum all-topics Contre quoi (2026-09-16)
 * - `_TZB210_rkgngb5o`+TS0501B → bulb_dimmable (brightness / WZ1)
 * - Same mfr + TS0502B stays bulb_tunable_white (p2432) — one mfr many pids NORMAL
 * - Do NOT invent Cartesian 4upl1fcj+TS0505B / qd7hej8u+TS0041 from Bo #652
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2535 forum all-topics rkgngb5o TS0501B dim', () => {
  it('compose bulb_dimmable lists rkgngb5o + TS0501B', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/bulb_dimmable/driver.compose.json'),
      'utf8',
    ));
    const mfrs = compose.zigbee?.manufacturerName || [];
    const pids = compose.zigbee?.productId || [];
    assert.ok(mfrs.some((m) => /_TZB210_rkgngb5o/i.test(m)));
    assert.ok(pids.some((p) => String(p).toUpperCase() === 'TS0501B'));
  });

  it('registry locks couple-scoped dim vs CCT sibling', () => {
    const reg = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'data/user-misattribution-registry.json'),
      'utf8',
    ));
    const dim = (reg.cases || []).find((c) => c.id === 'p2535-tzb210-rkgngb5o-ts0501b-dim');
    const cct = (reg.cases || []).find((c) => c.id === 'p2432-tzb210-rkgngb5o-cct');
    assert.ok(dim);
    assert.strictEqual(dim.canonicalDriver, 'bulb_dimmable');
    assert.deepStrictEqual(dim.productId, ['TS0501B']);
    assert.ok(dim.forbiddenDrivers.includes('bulb_tunable_white'));
    assert.ok(cct);
    assert.strictEqual(cct.canonicalDriver, 'bulb_tunable_white');
    assert.deepStrictEqual(cct.productId, ['TS0502B']);
  });

  it('DeviceFingerprintDB routes TS0501B→bulb_dimmable and TS0502B→CCT', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/DeviceFingerprintDB.js'), 'utf8');
    assert.ok(/'_TZB210_rkgngb5o\|TS0501B':\s*\{\s*driver:\s*'bulb_dimmable'/.test(src));
    assert.ok(/'_TZB210_rkgngb5o\|TS0502B':\s*\{\s*driver:\s*'bulb_tunable_white'/.test(src));
  });

  it('does not invent Bo #652 Cartesian wrong couples on compose', () => {
    const button = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_1/driver.compose.json'),
      'utf8',
    ));
    const bulbRgb = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/bulb_rgb/driver.compose.json'),
      'utf8',
    ));
    // 4upl1fcj is button TS0041 — must NOT gain TS0505B on button driver
    const btnMfr = (button.zigbee?.manufacturerName || []).some((m) => /4upl1fcj/i.test(m));
    if (btnMfr) {
      assert.ok(!(button.zigbee?.productId || []).some((p) => String(p).toUpperCase() === 'TS0505B'));
    }
    // qd7hej8u is bulb TS0505B — must NOT gain TS0041 invent on bulb
    const rgbMfr = (bulbRgb.zigbee?.manufacturerName || []).some((m) => /qd7hej8u/i.test(m));
    if (rgbMfr) {
      assert.ok(!(bulbRgb.zigbee?.productId || []).some((p) => String(p).toUpperCase() === 'TS0041'));
    }
  });
});
