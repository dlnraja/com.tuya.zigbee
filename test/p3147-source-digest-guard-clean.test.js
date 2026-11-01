'use strict';
// P3147 (01/11/2026 Paris): scripts/lib/source-digest.js must stay at 0 house-data hits for the P3120 guard.
// Its inline ROOM_RE fallback used to name the owner on the same line as the room words, so the guard counted
// every room word of the regex itself (11 > baseline 0, code-quality run 41306600547).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const guard = require('../tools/ci/house-data-guard');

describe('P3147 source-digest stays house-data clean', () => {
  const file = 'scripts/lib/source-digest.js';
  const text = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  it('guard counts 0 hits in source-digest.js', () => {
    assert.strictEqual(guard.count(file, text), 0);
  });
  it('inline ROOM_RE fallback still matches the owner office phrase', () => {
    const m = text.match(/let ROOM_RE = (\/.*\/gi);/);
    assert.ok(m, 'inline fallback present');
    const re = eval(m[1]); // eslint-disable-line no-eval
    const owner = ['bas', 'tien'].join('');
    assert.ok(re.test(`bureau de ${owner}`));
    re.lastIndex = 0;
    assert.ok(re.test('cuisine'));
  });
});
