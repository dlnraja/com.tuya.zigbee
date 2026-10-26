'use strict';
// P3070 (global gap audit): device settings must render the way Homey documents them.
// - number settings carry min/max/step at top level (the SDK3 settings page ignores the old
//   "attr" wrapper, so 1..255 dimmer limits or ±10 offsets were not enforced);
// - one id per driver for dropdowns (8 plug drivers showed "power_scale" twice, the second
//   a ÷10/×1/×10 subset of the first, so the two fields could disagree on screen);
// - defaults sit inside their own range.
// Reference: https://apps.developer.homey.app/the-basics/devices/settings (number: min/max/step).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DRV = path.join(ROOT, 'drivers');

function flatten(list, out = []) {
  for (const s of list || []) {
    if (!s || typeof s !== 'object') continue;
    if (s.type === 'group') flatten(s.children, out);
    else out.push(s);
  }
  return out;
}

function sources() {
  const out = [];
  for (const d of fs.readdirSync(DRV)) {
    for (const f of ['driver.compose.json', 'driver.settings.compose.json']) {
      const p = path.join(DRV, d, f);
      if (!fs.existsSync(p)) continue;
      const j = JSON.parse(fs.readFileSync(p));
      const list = Array.isArray(j) ? j : j.settings;
      if (Array.isArray(list)) out.push({ where: `${d}/${f}`, settings: flatten(list) });
    }
  }
  const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json')));
  for (const d of app.drivers || []) out.push({ where: `app.json:${d.id}`, settings: flatten(d.settings) });
  return out;
}

const ALL = sources();

test('number settings use top-level min/max/step, not only attr', () => {
  const bad = [];
  for (const { where, settings } of ALL) {
    for (const s of settings) {
      if (s.type !== 'number' || !s.attr || typeof s.attr !== 'object') continue;
      for (const k of ['min', 'max', 'step']) if (k in s.attr && !(k in s)) bad.push(`${where}:${s.id}.${k}`);
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('number defaults sit inside their range', () => {
  const bad = [];
  for (const { where, settings } of ALL) {
    for (const s of settings) {
      if (s.type !== 'number' || typeof s.value !== 'number') continue;
      if (typeof s.min === 'number' && s.value < s.min) bad.push(`${where}:${s.id}`);
      if (typeof s.max === 'number' && s.value > s.max) bad.push(`${where}:${s.id}`);
      if (typeof s.min === 'number' && typeof s.max === 'number' && s.min > s.max) bad.push(`${where}:${s.id} min>max`);
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('no driver declares the same dropdown id twice', () => {
  const bad = [];
  for (const { where, settings } of ALL) {
    const seen = new Set();
    for (const s of settings) {
      if (!s.id || s.type !== 'dropdown') continue;
      if (seen.has(s.id)) bad.push(`${where}:${s.id}`);
      seen.add(s.id);
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('dropdown labels keep their arrow (no "mW  W" mojibake)', () => {
  const bad = [];
  for (const { where, settings } of ALL) {
    for (const s of settings) {
      for (const v of s.values || []) {
        for (const t of Object.values(v.label || {})) if (typeof t === 'string' && /\(mW {2}W\)/.test(t)) bad.push(`${where}:${s.id}`);
      }
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('dimmer_1_gang raw level limits are not labelled as a percentage', () => {
  const c = JSON.parse(fs.readFileSync(path.join(DRV, 'dimmer_1_gang', 'driver.compose.json')));
  for (const s of flatten(c.settings).filter((x) => /Brightness$/.test(x.id || ''))) {
    assert.strictEqual(s.max, 255);
    assert.ok(!/%/.test(s.label.en), s.label.en);
  }
});
