'use strict';
// P3065 D23 — 61 app-level Flow args carried an arg-level "value" key. It is not part of the Homey SDK Flow arg
// schema (https://apps.developer.homey.app/the-basics/flow/arguments), so Homey ignores it and it only cost upload
// bytes (~0.75 KB); removing it changes nothing at runtime. Ratchet: it never comes back.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

test('no Flow arg carries the non-SDK "value" key (compose and root app.json)', () => {
  const bad = [];
  const scan = (c, where) => { for (const a of c.args || []) if (Object.prototype.hasOwnProperty.call(a, 'value')) bad.push(`${where}:${c.id}:${a.name}`); };
  for (const k of ['triggers', 'conditions', 'actions']) {
    const dir = path.join(ROOT, '.homeycompose/flow', k);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) scan(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), 'compose');
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    for (const c of (app.flow && app.flow[k]) || []) scan(c, 'app.json');
  }
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const f = path.join(ROOT, 'drivers', d, 'driver.flow.compose.json');
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const k of ['triggers', 'conditions', 'actions']) for (const c of j[k] || []) scan(c, d);
  }
  assert.deepStrictEqual(bad, []);
});
