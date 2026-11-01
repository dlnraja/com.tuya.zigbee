'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const g = require('../scripts/autonomy/autofix-gate');

describe('P3104 autofix gate (decide.js + ledger)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'afg-'));
  fs.mkdirSync(path.join(root, 'config'));
  it('allows a first attempt, no code fix for an unknown signature', () => {
    const r = g.check('ci_red:X', { entries: {}, events: [] }, {}, root);
    assert.strictEqual(r.allow, true);
    assert.strictEqual(r.codeFix, false);
  });
  it('blocks after max attempts per signature in 24h', () => {
    const now = Date.now();
    const l = { entries: {}, events: [1, 2, 3, 4, 5].map(() => ({ t: now, sig: 'ci_red:X', ok: true })) };
    assert.strictEqual(g.check('ci_red:X', l, {}, root).allow, false);
  });
  it('honours the autofix kill switch', () => {
    fs.writeFileSync(path.join(root, 'config', 'autonomy-paused.autofix'), '');
    const r = g.check('ci_red:X', { entries: {}, events: [] }, {}, root);
    assert.deepStrictEqual([r.allow, r.why], [false, 'kill switch autofix']);
  });
  it('ci-autofix runs the gate before handle and keeps the ledger in the cache', () => {
    const y = yaml.load(fs.readFileSync(path.join(__dirname, '../.github/workflows/ci-autofix.yml'), 'utf8'));
    const steps = y.jobs.triage.steps;
    const gi = steps.findIndex((s) => s.id === 'gate');
    const hi = steps.findIndex((s) => s.id === 'handle');
    assert.ok(gi > -1 && hi > gi && /allow == 'true'/.test(steps[hi].if));
    assert.ok(steps.some((s) => /cache\/save@[0-9a-f]{40}/.test(s.uses || '')));
    assert.ok(!/git (add|commit)[^\n]*autonomy-learned/.test(JSON.stringify(steps)));
  });
});
