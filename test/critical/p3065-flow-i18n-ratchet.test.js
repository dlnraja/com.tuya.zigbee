'use strict';
// P3065: driver flow-card i18n ratchet (driver.flow.compose.json is what the build ships).
// A French title equal to the English one is a placeholder unless the word is the same in
// French (allow-list). de/nl missing titles may only shrink.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const SAME_IN_FR = new Set(['Menu', 'Vibration', 'Scene', 'Mode', 'Code', 'Timer', 'Test']);
const CEIL = { de: 342, nl: 335 };
// titleFormatted gaps (P3065b: copied from the card's own title.de/nl when en matches)
const CEIL_TF = { de: 1286, nl: 1262 };

test('P3065 flow i18n: no FR placeholder titles, de/nl gaps never grow', () => {
  const placeholders = []; const miss = { de: 0, nl: 0 }; const missTf = { de: 0, nl: 0 };
  const D = path.join(ROOT, 'drivers');
  for (const d of fs.readdirSync(D)) {
    const p = path.join(D, d, 'driver.flow.compose.json');
    if (!fs.existsSync(p)) {continue;}
    let j; try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_e) { continue; }
    for (const k of ['triggers', 'conditions', 'actions']) {
      for (const c of j[k] || []) {
        for (const f of ['title', 'titleFormatted']) {
          const t = c[f];
          if (t && t.fr && t.fr === t.en && /[a-z]{3}/i.test(t.en) && !SAME_IN_FR.has(t.en)) {placeholders.push(`${d}:${c.id}:${f}`);}
        }
        for (const l of Object.keys(miss)) { if (c.title && c.title.en && !c.title[l]) {miss[l] += 1;} if (c.titleFormatted && c.titleFormatted.en && !c.titleFormatted[l]) {missTf[l] += 1;} }
      }
    }
  }
  assert.deepStrictEqual(placeholders, []);
  for (const l of Object.keys(CEIL)) {assert.ok(miss[l] <= CEIL[l], `${l} missing flow titles ${miss[l]} > ${CEIL[l]}`); assert.ok(missTf[l] <= CEIL_TF[l], `${l} missing titleFormatted ${missTf[l]} > ${CEIL_TF[l]}`);}
});
