'use strict';

/**
 * P3070 — every driver name has German and Dutch text (own short translations).
 * WHY: 112 drivers showed English names to de users and 85 to nl users in the pairing list.
 * Size cost was measured (headroom stays >= 290 KB) before adding them.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.join(__dirname, '..', '..');

describe('P3070 driver names de/nl', () => {
  it('compose: every name with en also has non-empty de and nl', () => {
    const bad = [];
    for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const f = path.join(ROOT, 'drivers', id, 'driver.compose.json');
      if (!fs.existsSync(f)) continue;
      const n = JSON.parse(fs.readFileSync(f, 'utf8')).name || {};
      if (!n.en) continue;
      for (const l of ['de', 'nl']) {
        if (typeof n[l] !== 'string' || !n[l].trim()) bad.push(`${id}:${l}`);
      }
    }
    assert.deepStrictEqual(bad, []);
  });

  it('app.json de/nl names match compose when present', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const bad = [];
    for (const d of app.drivers || []) {
      const f = path.join(ROOT, 'drivers', d.id, 'driver.compose.json');
      if (!fs.existsSync(f) || !d.name) continue;
      const n = JSON.parse(fs.readFileSync(f, 'utf8')).name || {};
      for (const l of ['de', 'nl']) {
        if (d.name[l] !== undefined && d.name[l] !== n[l]) bad.push(`${d.id}:${l}`);
      }
    }
    assert.deepStrictEqual(bad, []);
  });
});
