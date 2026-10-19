'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { evaluate } = require('../../scripts/ci/footprint-report.js');

describe('P2830d footprint budgets (report-only)', () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config', 'footprint-budgets.json'), 'utf8'));
  it('budget file is warn-only and covers ROM, RAM and CPU-ish signals', () => {
    assert.equal(cfg.mode, 'warn');
    for (const k of ['payloadMB', 'payloadFiles', 'appJsonMB', 'libMB', 'driversMB', 'nodeModulesMB', 'bootHeapMB', 'setIntervalSites']) {
      assert.ok(typeof cfg.budgets[k] === 'number' && cfg.budgets[k] > 0, k);
    }
    assert.ok(cfg.budgets.appJsonMB <= 4, 'app.json budget must stay under the 4 MB Athom limit');
  });
  it('evaluate flags only values above their budget and tolerates unmeasured metrics', () => {
    const rows = evaluate({ payloadMB: 40, appJsonMB: 3, bootHeapMB: null }, { payloadMB: 35, appJsonMB: 3.95, bootHeapMB: 48, libMB: 10 });
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    assert.equal(by.payloadMB.ok, false);
    assert.equal(by.appJsonMB.ok, true);
    assert.equal(by.bootHeapMB.ok, true);
    assert.equal(by.libMB.note, 'not measured');
  });
  it('the publish action runs the report as a non-blocking step', () => {
    const y = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'actions', 'homey-app-publish', 'action.yml'), 'utf8');
    assert.match(y, /footprint-report\.js/);
    assert.match(y, /continue-on-error: true/);
  });
});
