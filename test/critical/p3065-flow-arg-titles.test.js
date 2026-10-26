'use strict';
// P3065 D22 — 119 driver Flow args (number/text: threshold, delay, lux, distance…) had no title, so the Flow
// editor only showed the placeholder digits. Each now has a short en+fr title keyed by the arg name.
// Mode/Zone/Type got an identical fr (free after compact-shared-text); start_effect's '/64' became 'Speed (0–64)'.
// Device args are left alone (Homey labels them itself). Ratchet: every non-device arg keeps en+fr titles.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

test('every non-device Flow arg has a title; French gaps never grow', () => {
  const bad = [];
  const noFr = [];
  let seen = 0;
  const scan = (c, where) => {
    for (const a of c.args || []) {
      if (a.type === 'device') continue;
      seen++;
      const t = a.title;
      const en = typeof t === 'string' ? t : t && t.en;
      const fr = typeof t === 'string' ? null : t && t.fr;
      if (!en) bad.push(`${where}:${c.id}:${a.name}`);
      else if (!fr) noFr.push(`${where}:${c.id}:${a.name}`);
    }
  };
  for (const k of ['triggers', 'conditions', 'actions']) {
    const dir = path.join(ROOT, '.homeycompose/flow', k);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) scan(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), 'app');
  }
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const f = path.join(ROOT, 'drivers', d, 'driver.flow.compose.json');
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const k of ['triggers', 'conditions', 'actions']) for (const c of j[k] || []) scan(c, d);
  }
  assert.ok(seen > 500, `args seen ${seen}`);
  assert.deepStrictEqual(bad, []);
  assert.deepStrictEqual(noFr, [], 'args without a French title');
});
