'use strict';
// Shared rules-gate runner: one gate list used by the composite action and safe-auto-commit.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const RG = require('../../scripts/ci/rules-gates.js');

test('rules-gates: core excludes compose-sync, full adds it, anti-bot runs first', () => {
  const core = RG.select({ profile: 'core' }).map((g) => g.id);
  const full = RG.select({ profile: 'full' }).map((g) => g.id);
  assert.strictEqual(core[0], 'anti-bot');
  assert.ok(core.includes('p2138') && core.includes('regression-lessons'));
  assert.ok(!core.includes('compose-sync'));
  assert.deepStrictEqual(full, [...core, 'compose-sync']);
  assert.deepStrictEqual(RG.select({ only: 'p2138,flow-title' }).map((g) => g.id), ['p2138', 'flow-title']);
});

test('rules-gates: a missing gate file is skipped, not fatal', () => {
  const r = RG.runGate({ id: 'x', file: 'tools/ci/__missing_gate__.js' });
  assert.strictEqual(r.status, 'skipped');
});

test('rules-gates: composite action and safe-auto-commit use the shared runner', () => {
  const action = fs.readFileSync(path.join(ROOT, '.github/actions/rules-gates/action.yml'), 'utf8');
  assert.match(action, /node scripts\/ci\/rules-gates\.js/);
  const sac = fs.readFileSync(path.join(ROOT, 'scripts/ci/safe-auto-commit.js'), 'utf8');
  assert.match(sac, /require\('\.\/rules-gates'\)/);
  for (const wf of ['auto-enrich-closed-loop', 'continuous-flow', 'market-couples-intake', 'blakadder-fetch', 'weekly-sovereign-loop']) {
    const t = fs.readFileSync(path.join(ROOT, `.github/workflows/${wf}.yml`), 'utf8');
    assert.match(t, /uses: \.\/\.github\/actions\/rules-gates/, wf);
  }
});

test('continuous-flow has no schedule or push trigger (manual dispatch only)', () => {
  const t = fs.readFileSync(path.join(ROOT, '.github/workflows/continuous-flow.yml'), 'utf8');
  const on = t.slice(t.indexOf('\non:'), t.indexOf('\npermissions:'));
  assert.ok(!/\n  schedule:/.test(on) && !/\n  push:/.test(on));
  assert.match(on, /workflow_dispatch:/);
});
