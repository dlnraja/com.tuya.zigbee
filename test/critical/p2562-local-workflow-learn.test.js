'use strict';

/**
 * P2562 — Local learning for ALL workflows + Homey energy learner still present
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..', '..');
const Learner = require(path.join(ROOT, 'tools/ci/LocalWorkflowLearner.js'));

describe('P2562 LocalWorkflowLearner', () => {
  it('EMA success rises with ok runs; chronic fail recommends soft heal', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lwl-'));
    const L = new Learner({ root: ROOT, statePath: path.join(tmp, 'STATE.json') });
    for (let i = 0; i < 6; i++) L.observe('demo-wf', { ok: false, durationMs: 1000 });
    const bad = L.recommend('demo-wf');
    assert.equal(bad.action, 'soft_skip_or_heal');

    const L2 = new Learner({ root: ROOT, statePath: path.join(tmp, 'STATE2.json') });
    for (let i = 0; i < 8; i++) L2.observe('healthy-wf', { ok: true, durationMs: 500 });
    const good = L2.recommend('healthy-wf');
    assert.equal(good.action, 'run');
    assert.ok(good.row.successEma > 0.8);
  });

  it('Homey energy learner + CI learner modules exist', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'lib/telemetry/LocalSmartEnergyLearner.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/LocalWorkflowLearner.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/local-workflow-learn.js')));
  });

  it('inject script targets all workflows + LOCAL_SMART_LEARN', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/inject-forfait-env-workflows.js'), 'utf8');
    assert.match(src, /LOCAL_SMART_LEARN/);
    assert.match(src, /LOCAL_ENERGY_LEARN/);
    assert.match(src, /ALL/);
  });

  it('orchestrator observes local-workflow-learn', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/local-auto-improve-orchestrator.js'), 'utf8');
    assert.match(src, /local-workflow-learn\.js/);
    assert.match(src, /LOCAL_SMART_LEARN/);
  });

  it('SSOT declares BOTH runtime + CI learners', () => {
    const ssot = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/local-workflow-learn-ssot.json'),
      'utf8',
    ));
    assert.equal(ssot.classify, 'BOTH');
    assert.match(ssot.runtimeHomey.learner, /LocalSmartEnergyLearner/);
    assert.match(ssot.ciWorkflows.learner, /LocalWorkflowLearner/);
  });
});
