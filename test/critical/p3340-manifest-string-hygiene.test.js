'use strict';
// P3340 (16/11/2026): the payload preflight blocks app.json strings Athom's processing could choke on
// (control characters, lone surrogates, U+FFFD mojibake, BOM, empty or non-string zigbee ids).
// Real padded manufacturer names such as "AOYAN  " are device strings and must stay allowed.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { preflight, manifestStringProblems } = require('../../scripts/ci/payload-preflight.cjs');

function png(w, h) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
  return b;
}
function fixture(mut) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'p3340-'));
  const w = (rel, c) => { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.writeFileSync(path.join(d, rel), c); };
  const app = { id: 'x', drivers: [{ id: 'a', name: { en: 'A', fr: 'Scène' }, zigbee: { manufacturerName: ['_TZ3000_abc', 'AOYAN  '], productId: ['TS0001'] },
    images: { small: '/drivers/a/assets/images/small.png', large: '/drivers/a/assets/images/large.png' } }],
    flow: { actions: [{ id: 'c1', title: { en: 'Do', fr: 'Rappel de scène' } }] } };
  w('drivers/a/driver.js', '//'); w('drivers/a/device.js', '//');
  w('drivers/a/assets/images/small.png', png(75, 75)); w('drivers/a/assets/images/large.png', png(500, 500));
  w('locales/en.json', '{}');
  if (mut) mut(app);
  w('app.json', JSON.stringify(app));
  return d;
}

test('clean manifest (accents, padded real manufacturer name) passes', () => {
  assert.deepStrictEqual(preflight(fixture()).errors, []);
});
test('control char, lone surrogate, U+FFFD and BOM inside strings are blocking', () => {
  const r = preflight(fixture((app) => {
    app.flow.actions[0].title.fr = 'Rappel de sc\uFFFDne';
    app.flow.actions[0].title.de = 'A\u0007B';
    app.drivers[0].name.it = 'x\uD800';
    app.drivers[0].name.nl = '\uFEFFNaam';
  }));
  const all = r.errors.join('\n');
  assert.match(all, /U\+FFFD/);
  assert.match(all, /control character/);
  assert.match(all, /lone surrogate/);
  assert.match(all, /BOM/);
});
test('empty, whitespace-only or non-string zigbee ids are blocking', () => {
  const p = manifestStringProblems({ drivers: [{ id: 'a', zigbee: { manufacturerName: ['', '  ', 7], productId: [null] } }] });
  assert.strictEqual(p.filter((x) => /zigbee/.test(x)).length, 4);
});
