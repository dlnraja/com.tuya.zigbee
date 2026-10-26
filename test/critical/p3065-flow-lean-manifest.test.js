'use strict';
// P3065 D24a: two lossless manifest savings that pay for the hvac_system_mode family cards.
//  - a Flow arg placeholder identical to its own title (Homey shows the title anyway)
//  - an all-empty "flow" block in driver.compose.json next to a driver.flow.compose.json (the build keeps it as dead bytes)
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const same = (p, t) => {
  if (!p || !t) {return false;}
  const P = typeof p === 'string' ? { en: p } : p;
  const T = typeof t === 'string' ? { en: t } : t;
  return Object.keys(P).every((l) => P[l] === (T[l] ?? T.en));
};
function cards() {
  const out = [];
  for (const k of ['triggers', 'conditions', 'actions']) {
    const d = path.join(ROOT, '.homeycompose/flow', k);
    for (const f of fs.readdirSync(d)) {out.push([`${k}/${f}`, read(path.join(d, f))]);}
  }
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const p = path.join(ROOT, 'drivers', id, 'driver.flow.compose.json');
    if (!fs.existsSync(p)) {continue;}
    const j = read(p);
    for (const k of ['triggers', 'conditions', 'actions']) {for (const c of j[k] || []) {out.push([`${id}/${c.id}`, c]);}}
  }
  return out;
}

describe('P3065 D24a lean Flow manifest', () => {
  it('no Flow arg placeholder repeats its own title', () => {
    const bad = [];
    for (const [where, c] of cards()) {for (const a of c.args || []) {if (same(a.placeholder, a.title)) {bad.push(`${where}:${a.name}`);}}}
    assert.deepEqual(bad, []);
  });

  it('placeholders that add information are kept', () => {
    const kept = cards().reduce((n, [, c]) => n + (c.args || []).filter((a) => a.placeholder).length, 0);
    assert.ok(kept > 100, `placeholders left ${kept}`);
  });

  // 29 removed in D24a (the ones the upload kept); the other 59 are already dropped at upload, so they are left
  // alone (no churn in other workers' driver files). Ratchet: never more.
  const EMPTY_FLOW_CEIL = 59;
  it('all-empty driver "flow" blocks next to a driver.flow.compose.json do not grow', () => {
    const bad = [];
    for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
      const dc = path.join(ROOT, 'drivers', id, 'driver.compose.json');
      if (!fs.existsSync(dc) || !fs.existsSync(path.join(ROOT, 'drivers', id, 'driver.flow.compose.json'))) {continue;}
      const f = read(dc).flow;
      if (f && typeof f === 'object' && Object.values(f).every((v) => Array.isArray(v) && v.length === 0)) {bad.push(id);}
    }
    assert.ok(bad.length <= EMPTY_FLOW_CEIL, `empty driver flow blocks ${bad.length}: ${bad.slice(0, 5).join(', ')}`);
  });
});
