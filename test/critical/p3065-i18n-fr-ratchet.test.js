'use strict';
// P3065: driver i18n ratchet. FR is complete for driver names and settings labels;
// de/nl gaps may only shrink (raise nothing, lower the ceilings when you fill more).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const CEIL = { fr: { labels: 0, names: 0 }, de: { labels: 767, names: 126 }, nl: { labels: 633, names: 97 } };

function gaps() {
  const out = { fr: { labels: [], names: [] }, de: { labels: [], names: [] }, nl: { labels: [], names: [] } };
  const D = path.join(ROOT, 'drivers');
  const walk = (arr, cb) => { for (const s of arr || []) { if (s && s.children) {walk(s.children, cb);} if (s && s.label && s.label.en) {cb(s);} } };
  for (const d of fs.readdirSync(D)) {
    const f = path.join(D, d, 'driver.compose.json');
    if (!fs.existsSync(f)) {continue;}
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_e) { continue; }
    for (const l of Object.keys(out)) {
      if (j.name && j.name.en && !j.name[l]) {out[l].names.push(d);}
      walk(j.settings, (s) => { if (!s.label[l]) {out[l].labels.push(`${d}:${s.id || s.label.en}`);} });
    }
  }
  return out;
}

test('P3065 i18n: FR driver names/settings labels complete; de/nl gaps never grow', () => {
  const g = gaps();
  for (const l of Object.keys(CEIL)) {
    assert.ok(g[l].labels.length <= CEIL[l].labels, `${l} label gaps ${g[l].labels.length} > ${CEIL[l].labels}: ${g[l].labels.slice(0, 5).join(', ')}`);
    assert.ok(g[l].names.length <= CEIL[l].names, `${l} name gaps ${g[l].names.length} > ${CEIL[l].names}: ${g[l].names.slice(0, 5).join(', ')}`);
  }
});
