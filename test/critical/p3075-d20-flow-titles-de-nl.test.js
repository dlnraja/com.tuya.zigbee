'use strict';
// P3075 D20: German and Dutch titles for the most-used driver flow cards, written in
// driver.flow.compose.json (the file the bump rebuild reads), only where they were missing.
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const cards = (d) => {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', d, 'driver.flow.compose.json'), 'utf8'));
  return [...j.triggers || [], ...j.conditions || [], ...j.actions || []];
};

describe('P3075 D20 de/nl driver flow titles', () => {
  it('shared button cards carry the D20 wording in compose', () => {
    const t = cards('air_purifier_din').map((c) => c.title || {});
    const single = t.find((x) => x.fr === 'Appui simple - physique');
    assert.ok(single, 'card present');
    assert.strictEqual(single.de, 'Einfacher Druck – Taste');
    assert.strictEqual(single.nl, 'Enkele druk – knop');
  });

  it('every German title has its Dutch twin and no broken characters', () => {
    const bad = [];
    for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      if (!fs.existsSync(path.join(ROOT, 'drivers', d, 'driver.flow.compose.json'))) { continue; }
      let list; try { list = cards(d); } catch (_e) { continue; }
      for (const c of list) {
        const t = c.title;
        if (!t || typeof t !== 'object' || !t.de) { continue; }
        if (!t.nl || /\uFFFD/.test(t.de + t.nl)) { bad.push(`${d}:${c.id}`); }
      }
    }
    assert.deepStrictEqual(bad, []);
  });
});
