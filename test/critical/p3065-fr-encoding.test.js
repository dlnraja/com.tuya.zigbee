'use strict';
// P3065 D21 (data fix, all branches) — user-facing strings carried broken text: UTF-8 read as CP850 or CP1252
// ("D├®tection", "­ƒöî Prise", "Ã‰quilibré", "Ã—10"), lost bytes ("Sc??ne", "Gedr??ckt", "0x05 ??? mode") and a glued French "à"
// ("Mise àjour", "jusqu'àce", "àla"). Repaired by /workspace/p3065/fix_cp850.py + fix_fr_encoding.cjs; this
// test keeps those patterns out of every shipped JSON (drivers, .homeycompose, app.json, locales).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');
const ANY = [
  ['cp850 mojibake', /├[®ëáàè¿ó«ñ]|­ƒ|Ô[ÿØÜø]/],
  ['cp1252 mojibake', /Ã[\u00a0-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u2013\u2014\u2018-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]|Â[\u00a0-\u00bf]|â€/],
  ['lost bytes', /\p{L}\?\?|\?\?\p{L}| \?\?\? /u],
];
const FR = [['glued à', /(^|[^\p{L}])à(?=\p{L})/u]];

function* jsonFiles(dir) {
  if (!fs.existsSync(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== 'assets') yield* jsonFiles(p); } else if (e.name.endsWith('.json')) yield p;
  }
}

test('no mis-encoded or glued French text in shipped JSON strings', () => {
  const files = [path.join(ROOT, 'app.json'), ...jsonFiles(path.join(ROOT, 'drivers')), ...jsonFiles(path.join(ROOT, '.homeycompose')), ...jsonFiles(path.join(ROOT, 'locales'))];
  const bad = [];
  let fr = 0;
  const walk = (v, rel, key) => {
    if (typeof v === 'string') {
      // user-facing text only: language-keyed values and locale files (manufacturerName ids are matched as-is, never "repaired")
      if (!(rel.startsWith('locales') || /^[a-z]{2}$/.test(key || ''))) return;
      for (const [n, re] of ANY) if (re.test(v)) bad.push(`${rel} ${n}: ${v.slice(0, 60)}`);
      if (key === 'fr' || rel.endsWith('fr.json')) { fr++; for (const [n, re] of FR) if (re.test(v)) bad.push(`${rel} ${n}: ${v.slice(0, 60)}`); }
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, rel, Array.isArray(v) ? key : k);
  };
  for (const f of files) if (fs.existsSync(f)) walk(JSON.parse(fs.readFileSync(f, 'utf8')), path.relative(ROOT, f), null);
  assert.ok(fr > 1000, `fr strings seen ${fr}`);
  assert.deepStrictEqual(bad.slice(0, 20), []);
});
