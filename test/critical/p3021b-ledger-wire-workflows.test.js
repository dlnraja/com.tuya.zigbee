'use strict';
// P3021b: the six workflows that did not write the ledger now do, through scripts/progress/ledger-intake.js
// (diag mode with --by=<workflow>, or the new `run` mode) and a gated safe-auto-commit of the ledger only.
const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const intake = require('../../scripts/progress/ledger-intake');

const ROOT = path.join(__dirname, '..', '..');
const wf = (n) => yaml.load(fs.readFileSync(path.join(ROOT, '.github', 'workflows', `${n}.yml`), 'utf8'));

describe('P3021b ledger run summaries', () => {
  it('keeps numbers only, one nested level, bounded', () => {
    const c = intake.summaryCounts({ ok: true, delta: 3, note: 'free text', final: { mfrs: 10, list: [1, 2], deep: { x: 1 } }, errors: ['a', 'b'] });
    assert.deepStrictEqual(c, { delta: 3, 'final.mfrs': 10, 'final.list.length': 2, 'errors.length': 2 });
    const big = {}; for (let i = 0; i < 40; i++) { big[`k${i}`] = i; }
    assert.strictEqual(Object.keys(intake.summaryCounts(big)).length, 16);
    assert.deepStrictEqual(intake.summaryCounts(null), {});
    assert.deepStrictEqual(intake.summaryCounts([1, 2]), {});
  });

  it('writes one entry per workflow and is idempotent', () => {
    const L = { items: {} };
    assert.strictEqual(intake.recordRunSummary('fleet-intelligent-enrich', { ok: true, delta: 2 }, L, { runId: '123' }), 'new');
    const e = L.items['workflow-run:fleet-intelligent-enrich'];
    assert.strictEqual(e.status, 'done');
    assert.strictEqual(e.by, 'fleet-intelligent-enrich');
    assert.deepStrictEqual(e.counts, { delta: 2 });
    assert.strictEqual(e.lastChangeRun, '123');
    assert.strictEqual(intake.recordRunSummary('fleet-intelligent-enrich', { ok: true, delta: 2 }, L, { runId: '124' }), 'same');
    assert.strictEqual(L.items['workflow-run:fleet-intelligent-enrich'].lastChangeRun, '123');
    assert.strictEqual(intake.recordRunSummary('fleet-intelligent-enrich', { ok: false, delta: 2 }, L, { runId: '125' }), 'changed');
    assert.strictEqual(L.items['workflow-run:fleet-intelligent-enrich'].status, 'pending');
  });

  it('flags a missing summary, rejects bad ids, respects manual entries', () => {
    const L = { items: { 'workflow-run:auto-enrich-closed-loop': { status: 'done', manual: true } } };
    assert.strictEqual(intake.recordRunSummary('auto-enrich-closed-loop', null, L, { missing: true }), 'protected');
    assert.strictEqual(intake.recordRunSummary('Bad Id', {}, L), 'invalid');
    assert.strictEqual(intake.recordRunSummary('monthly-device-enrichment', null, L, { missing: true }), 'new');
    assert.strictEqual(L.items['workflow-run:monthly-device-enrichment'].status, 'pending');
  });

  it('diag intake records under the calling workflow', () => {
    const L = { items: {} };
    const report = { diagnostics: [{ id: 'abc', type: 'crash_report', errs: ['x'] }] };
    intake.recordDiagnostics(report, L, { by: 'fetch-diags' });
    const key = intake.diagKey({ id: 'abc' });
    assert.strictEqual(L.items[key].by, 'fetch-diags');
  });
});

describe('P3021b workflow wiring', () => {
  const cases = {
    'auto-enrich-closed-loop': 'run auto-enrich-closed-loop',
    'fleet-intelligent-enrich': 'run fleet-intelligent-enrich',
    'monthly-device-enrichment': 'run monthly-device-enrichment',
    'collect-diagnostics': '--by=collect-diagnostics',
    'fetch-diags': '--by=fetch-diags',
    'tuya-deep-diag': '--by=tuya-deep-diag',
  };
  for (const [name, needle] of Object.entries(cases)) {
    it(`${name} runs the intake and commits the ledger only, gated`, () => {
      const steps = Object.values(wf(name).jobs).flatMap((j) => j.steps || []);
      const intakeStep = steps.find((s) => s.id === 'p3021b_ledger');
      assert.ok(intakeStep, 'intake step');
      assert.ok(intakeStep['continue-on-error']);
      assert.ok(intakeStep.run.includes('scripts/progress/ledger-intake.js') && intakeStep.run.includes(needle));
      const commit = steps.find((s) => String(s.run || '').includes(`--id=${name}-ledger`));
      assert.ok(commit, 'commit step');
      assert.ok(commit.run.includes('scripts/ci/safe-auto-commit.js'));
      assert.ok(commit.run.includes('--paths="data/progress/ledger.json"'));
      assert.ok(commit['continue-on-error']);
    });
  }

  it('tuya-deep-diag keeps the diagnose job read-only', () => {
    const d = wf('tuya-deep-diag');
    assert.strictEqual(d.permissions.contents, 'read');
    assert.strictEqual(d.jobs.diagnose.permissions, undefined);
    assert.strictEqual(d.jobs.ledger.permissions.contents, 'write');
    assert.deepStrictEqual(d.jobs.ledger.needs, ['diagnose']);
  });
});
