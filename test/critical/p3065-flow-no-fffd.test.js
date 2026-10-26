'use strict';
// P3065 data fix (ported from master 90d040555b): driver flow card texts must not contain
// U+FFFD (a broken-encoding replacement char, e.g. "sc\uFFFDne" instead of "scène").
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('P3065: no U+FFFD (broken encoding) in driver flow cards', () => {
  const root = path.join(__dirname, '..', '..', 'drivers');
  const bad = fs.readdirSync(root).filter((d) => {
    const p = path.join(root, d, 'driver.flow.compose.json');
    return fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes('\uFFFD');
  });
  assert.deepStrictEqual(bad, []);
});
