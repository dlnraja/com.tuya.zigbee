'use strict';

/**
 * P3070 — the committed root app.json carries every driver-name locale its compose declares.
 * WHY: 92 drivers had a French name in driver.compose.json but not in the committed app.json
 * (the build reads compose, so the payload was right; tools reading app.json showed English).
 * Values may change in compose; a declared locale must never be missing from app.json.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.join(__dirname, '..', '..');

describe('P3070 driver names: app.json keeps compose locales', () => {
  it('every compose name locale exists in the root app.json', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const missing = [];
    for (const d of app.drivers || []) {
      const p = path.join(ROOT, 'drivers', d.id, 'driver.compose.json');
      if (!fs.existsSync(p)) {continue;}
      const c = JSON.parse(fs.readFileSync(p, 'utf8'));
      for (const lang of Object.keys(c.name || {})) {
        if (!(d.name && d.name[lang])) {missing.push(`${d.id}.${lang}`);}
      }
    }
    assert.deepStrictEqual(missing, []);
  });
});
