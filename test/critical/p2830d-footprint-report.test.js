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
  it('the publish pipeline runs the report as a non-blocking step', () => {
    const root = path.join(__dirname, '..', '..', '.github');
    const files = ['actions/homey-app-publish/action.yml', 'workflows/publish-stable.yml', 'workflows/bastien-publish.yml']
      .map((f) => path.join(root, f)).filter((f) => fs.existsSync(f));
    const hit = files.filter((f) => /footprint-report\.js/.test(fs.readFileSync(f, 'utf8')));
    assert.ok(hit.length >= 1, 'no publish workflow runs footprint-report.js');
    for (const f of hit) {
      const y = fs.readFileSync(f, 'utf8');
      const i = y.indexOf('footprint-report.js');
      assert.match(y.slice(Math.max(0, i - 200), i), /continue-on-error: true/, f);
    }
  });
});
