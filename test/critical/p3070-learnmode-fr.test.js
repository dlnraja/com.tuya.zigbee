'use strict';

/**
 * P3070 — every pairing (learnmode) instruction that has English text also has a French one.
 * WHY: 129 drivers showed English-only pairing help to French users. The French texts are our
 * own short rewrites; app.json mirrors the compose files.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.join(__dirname, '..', '..');
const lms = (d) => [d.learnmode, d.zigbee && d.zigbee.learnmode].filter(Boolean);

describe('P3070 learnmode French instructions', () => {
  it('compose: en instruction always has a non-empty, distinct fr', () => {
    const bad = [];
    for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const f = path.join(ROOT, 'drivers', id, 'driver.compose.json');
      if (!fs.existsSync(f)) {continue;}
      for (const lm of lms(JSON.parse(fs.readFileSync(f, 'utf8')))) {
        const i = lm.instruction || {};
        if (i.en && (!i.fr || !i.fr.trim() || i.fr === i.en)) {bad.push(id);}
      }
    }
    assert.deepStrictEqual(bad, []);
  });

  it('app.json mirrors compose fr instructions', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const bad = [];
    for (const d of app.drivers || []) {
      const f = path.join(ROOT, 'drivers', d.id, 'driver.compose.json');
      if (!fs.existsSync(f)) {continue;}
      const c = lms(JSON.parse(fs.readFileSync(f, 'utf8')));
      lms(d).forEach((lm, k) => {
        const a = (lm.instruction || {}).fr;
        const b = c[k] && (c[k].instruction || {}).fr;
        if (a !== b) {bad.push(d.id);}
      });
    }
    assert.deepStrictEqual(bad, []);
  });
});
