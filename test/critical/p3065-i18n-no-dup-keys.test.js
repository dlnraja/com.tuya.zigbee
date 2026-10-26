'use strict';
// P3065: i18n objects in compose JSON (label/name/title/hint/...) must not repeat a locale key.
// JSON.parse silently keeps the last duplicate, so a repeated "fr" hides a wrong translation.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LOCALE_KEY = /^[a-z]{2}$/;

function composeFiles() {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) {return;}
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {walk(p);} else if (e.name.endsWith('.json')) {out.push(p);}
    }
  };
  walk(path.join(ROOT, '.homeycompose'));
  for (const d of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    for (const f of ['driver.compose.json', 'driver.settings.compose.json', 'driver.flow.compose.json']) {
      const p = path.join(ROOT, 'drivers', d, f);
      if (fs.existsSync(p)) {out.push(p);}
    }
  }
  return out;
}

// Flat {...} blocks whose keys are all 2-letter locales = i18n objects.
function dupLocaleBlocks(src) {
  const bad = [];
  const blockRe = /\{[^{}\[\]]*\}/g;
  let m;
  while ((m = blockRe.exec(src))) {
    const keys = [...m[0].matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g)].map((k) => k[1]);
    if (!keys.length || !keys.every((k) => LOCALE_KEY.test(k))) {continue;}
    const seen = new Set();
    for (const k of keys) { if (seen.has(k)) { bad.push(m[0].slice(0, 120)); break; } seen.add(k); }
  }
  return bad;
}

test('P3065 detector flags a repeated locale key', () => {
  assert.strictEqual(dupLocaleBlocks('{"label": { "en": "A", "fr": "x", "fr": "B" }}').length, 1);
  assert.strictEqual(dupLocaleBlocks('{"label": { "en": "A", "fr": "B" }, "id": { "x": 1, "x": 2 }}').length, 0);
});

test('P3065 no compose i18n object repeats a locale key', () => {
  const offenders = [];
  for (const f of composeFiles()) {
    for (const b of dupLocaleBlocks(fs.readFileSync(f, 'utf8'))) {offenders.push(`${path.relative(ROOT, f)}: ${b}`);}
  }
  assert.deepStrictEqual(offenders, []);
});
