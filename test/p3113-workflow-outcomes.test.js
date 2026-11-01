'use strict';
/* eslint-env mocha */
// P3113 (t664u): workflow outcomes feed one bounded learning ledger with advisory hints.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { learn, emptyLedger, MAX_WF, MAX_LAST } = require('../scripts/learning/workflow-outcomes.cjs');
const at = (i) => new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString();
describe('P3113 workflow-outcomes learning ledger', function () {
  it('learns incrementally, dedups keys and derives backoff/relax hints', function () {
    const l = emptyLedger();
    const fails = [0, 1, 2].map((i) => ({ at: at(i), workflow: 'ci-collect', status: 'fail', key: `k${i}`, data: { wf: '.github/workflows/x.yml' } }));
    assert.strictEqual(learn(l, fails), 3);
    assert.strictEqual(learn(l, fails), 0);
    assert.strictEqual(l.workflows['x.yml'].hint, 'backoff');
    const oks = Array.from({ length: 10 }, (_, i) => ({ at: at(10 + i), workflow: 'x', status: 'ok', key: `o${i}`, data: { wf: 'x.yml' } }));
    learn(l, oks);
    assert.strictEqual(l.workflows['x.yml'].hint, 'relax');
    assert.ok(l.workflows['x.yml'].last.length <= MAX_LAST);
  });
  it('stays bounded and ignores unknown statuses', function () {
    const l = emptyLedger();
    const many = Array.from({ length: MAX_WF + 20 }, (_, i) => ({ at: at(i), workflow: `w${i}`, status: 'ok', key: `m${i}` }));
    many.push({ at: at(999), workflow: 'evil', status: 'rm -rf', key: 'z' });
    learn(l, many);
    assert.ok(Object.keys(l.workflows).length <= MAX_WF);
    assert.ok(!l.workflows.evil);
  });
  it('is wired into the automation loop', function () {
    const y = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'automation-loop.yml'), 'utf8');
    assert.ok(y.includes('scripts/learning/workflow-outcomes.cjs'));
  });
});
