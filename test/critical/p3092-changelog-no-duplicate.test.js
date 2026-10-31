'use strict';
// P3092: two maintenance builds in a row must not get the exact same changelog note.
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const path = require('path');
const CE = require(path.join(__dirname, '..', '..', 'scripts', 'automation', 'changelog-entry.js'));

describe('P3092 changelog write-back never repeats the previous note', () => {
  it('prefixes the version when the generated note equals the previous one', () => {
    const obj = {};
    const subjects = ['ci(P1): gates', 'chore: sync'];
    obj['1.0.1'] = CE.precise(subjects);
    const { obj: out } = CE.updateChangelog(obj, '1.0.2', subjects);
    assert.notStrictEqual(out['1.0.2'].en, out['1.0.1'].en);
    assert.match(out['1.0.2'].en, /^v1\.0\.2: /);
    if (out['1.0.2'].fr) {
      assert.match(out['1.0.2'].fr, /^v1\.0\.2 : /);
    }
  });

  it('leaves a different note and an existing human note untouched', () => {
    const obj = { '1.0.1': { en: 'Fixed: TS011F plug energy reading on the wall plugs.', fr: 'Corrigé : énergie TS011F.' } };
    const { obj: out } = CE.updateChangelog(obj, '1.0.2', ['ci(P1): gates']);
    assert.doesNotMatch(out['1.0.2'].en, /^v1\.0\.2: /);
    const human = { '1.0.2': { en: 'Hand-written note kept as is, long enough.' }, '1.0.1': { en: 'Hand-written note kept as is, long enough.' } };
    assert.strictEqual(CE.updateChangelog(human, '1.0.2', []).obj['1.0.2'].en, 'Hand-written note kept as is, long enough.');
  });
});
