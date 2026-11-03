'use strict';
/* eslint-env mocha */
// P3243c: a post-Test write-back note is never a vague family line (P3075 ceiling); it names items + P/GH refs.
const assert = require('assert');
const CE = require('../../scripts/automation/changelog-entry.js');
let B = null; try { B = require('../../scripts/automation/changelog-backfill.js'); } catch (_) { B = null; }

describe('P3243c write-back changelog is specific', () => {
  const subjects = ['fix(P3245 port): ZCL humidity x10 quirk (scaleZclHumidity) in all 9 drivers dividing measuredValue by 100 (GH#581)',
    'P3238: CI gate rejecting new driver with duplicate class+capabilities', 'chore(version): v1.0.226 written back after Test [skip ci]'];
  it('vague family note is enriched with subject heads and refs', () => {
    const e = CE.specific(subjects, { en: 'Fixed: climate sensors.', fr: 'Corrigé : capteurs d\u2019ambiance.' });
    assert.match(e.en, /^Fixed: climate sensors: ZCL humidity x10 quirk/);
    assert.match(e.en, /P3245/); assert.match(e.en, /GH#581/);
    assert.match(e.fr, /GH#581/);
    if (B) assert.notStrictEqual(B.needsRewrite(e), 'vague');
  });
  it('updateChangelog never writes a vague note for a fix build', () => {
    const r = CE.updateChangelog({}, '1.0.228', subjects);
    assert.ok(r.entry.en.length >= 40, r.entry.en);
    if (B) assert.notStrictEqual(B.needsRewrite(r.entry), 'vague', r.entry.en);
  });
  it('no user-facing subject keeps the base note', () => {
    const base = { en: 'Maintenance build: same devices and behaviour as the previous version.', fr: 'x' };
    assert.deepStrictEqual(CE.specific(['ci: y', 'chore: z'], base), base);
  });
});
