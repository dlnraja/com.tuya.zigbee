'use strict';
// P3065 D16 — dropdown/multiselect values in driver Flow cards keep only `title` (the key the Homey SDK
// documents for values). The undocumented `label` copy was folded into `title` (languages title lacked were
// added, nothing conflicted) and dropped: about 51 KB off the upload manifest, value ids unchanged.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const files = fs.readdirSync(path.join(ROOT, 'drivers'))
  .map((d) => path.join(ROOT, 'drivers', d, 'driver.flow.compose.json'))
  .filter((f) => fs.existsSync(f));

function eachValue(fn) {
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const kind of ['triggers', 'conditions', 'actions']) {
      for (const c of j[kind] || []) {
        for (const a of c.args || []) {
          for (const v of a.values || []) fn(v, `${path.basename(path.dirname(f))}/${c.id}/${a.name}/${v && v.id}`);
        }
      }
    }
  }
}

test('no driver flow value carries both title and label again', () => {
  const both = [];
  eachValue((v, where) => { if (v && v.title !== undefined && v.label !== undefined) both.push(where); });
  assert.deepStrictEqual(both, []);
});

test('every driver flow value still has an id and a shown text with English', () => {
  let n = 0;
  eachValue((v, where) => {
    n++;
    assert.ok(v && v.id !== undefined, `${where} id`);
    const t = v.title !== undefined ? v.title : v.label;
    assert.ok(typeof t === 'string' || (t && typeof t.en === 'string'), `${where} text`);
  });
  assert.ok(n > 1000, `expected >1000 values, got ${n}`);
});
