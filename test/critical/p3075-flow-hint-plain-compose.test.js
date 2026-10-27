'use strict';
// P3075 (t613u): the bump rebuilds app.json from the compose sources, so Flow trims must live in
// drivers/<id>/driver.flow.compose.json. This pins the plain-words hint pass there (headroom 283 -> 301 KB).
const assert = require('assert');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');
const ROOT = path.join(__dirname, '..', '..');
const P = require(path.join(ROOT, 'scripts', 'maintenance', 'flow-hint-plain.cjs'));

describe('P3075 Flow hints in plain words, in the compose sources', () => {
  it('compose driver cards carry no jargon-only or title-repeating hint (a rebuild keeps the trim)', () => {
    const r = P.run(ROOT, { write: false });
    assert.strictEqual(r.dropped + r.rewritten, 0, JSON.stringify(r));
  });
  it('jargon-only hints are dropped, useful parts kept in short words', () => {
    assert.strictEqual(P.planHint({ title: { en: 'Set child lock' }, hint: { en: 'Lock/unlock physical buttons (DP101)' } }), 'drop');
    const k = P.planHint({ title: { en: 'Set countdown timer' }, hint: { en: 'Auto turn off after countdown (DP7, max 86400s = 24h)' } });
    assert.ok(k && k.en && k.fr && !P.JARGON.test(k.en), JSON.stringify(k));
  });
  it('a hint that only repeats the title is dropped; a hint with new information stays', () => {
    assert.strictEqual(P.planHint({ title: { en: 'Door opened' }, hint: { en: 'When the door is opened' } }), 'drop');
    assert.strictEqual(P.planHint({ title: { en: 'Door opened' }, hint: { en: 'Only fires after the open delay set in the device settings' } }), null);
  });
});
