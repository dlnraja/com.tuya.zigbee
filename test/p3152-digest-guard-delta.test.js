'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { runDelta, ISO_RE } = require('../scripts/ci/digest-guard');
describe('P3152 digest-guard --delta (t735u/t736u)', () => {
  const rel = 'data/leads/__p3147_planted.tmp.json';
  const abs = path.join(__dirname, '..', rel);
  afterEach(() => { try { fs.unlinkSync(abs); } catch (_e) { /* none */ } });
  it('blocks a planted habit/schedule string in a new generated line', () => {
    fs.writeFileSync(abs, JSON.stringify({ note: 'lights off every evening at 22:30 when we go to bed' }));
    assert.ok(runDelta([rel]).length > 0);
  });
  it('allows technical facts with machine ISO stamps', () => {
    fs.writeFileSync(abs, JSON.stringify({ mfr: '_TZE204_1youk3hj', dp: 12, at: '2026-11-01T12:34:56Z' }));
    assert.deepStrictEqual(runDelta([rel]), []);
  });
  it('ISO stamp regex only strips full machine stamps', () => {
    assert.strictEqual('at 22:30'.replace(ISO_RE, '[ts]'), 'at 22:30');
  });
});
