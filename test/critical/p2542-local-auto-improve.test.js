'use strict';

/**
 * P2542 — Local auto-improve + forfait Contre quoi.
 * BOTH: cron workflows must force local AI; orchestrator must not call remote.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

describe('P2542 local auto-improve + forfait', () => {
  it('SSOT + docs + orchestrator + gate exist', () => {
    for (const rel of [
      'config/architecture/local-auto-improve-ssot.json',
      'docs/architecture/LOCAL_AUTO_IMPROVE_SSOT.md',
      'tools/ci/local-auto-improve-orchestrator.js',
      'tools/ci/p2542-local-auto-improve-gate.js',
      'tools/ci/inject-forfait-env-workflows.js',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
    }
  });

  it('SSOT locks no-external-AI doctrine + required cron env', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/local-auto-improve-ssot.json'), 'utf8')
    );
    assert.equal(ssot._meta.patch, 'P2542');
    assert.equal(ssot._meta.dualApp, 'BOTH');
    assert.equal(ssot.doctrine.noExternalAiByDefault, true);
    assert.equal(ssot.doctrine.preferLocalHeuristics, true);
    assert.equal(ssot.forfait.requiredEnvOnCron.AI_FORCE_LOCAL, 'true');
    assert.equal(ssot.forfait.requiredEnvOnCron.AI_ALLOW_REMOTE, 'false');
    assert.equal(ssot.forfait.requiredEnvOnCron.GMAIL_DIAG_AI_MAX, '0');
    assert.ok(Array.isArray(ssot.homeyRuntimeLocal.refs));
    assert.ok(ssot.homeyRuntimeLocal.refs.some((r) => /BootBudget/.test(r)));
  });

  it('forfait caps stay hard-local (no grok / remote off)', () => {
    const f = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/security/ai-plan-forfait.json'), 'utf8')
    );
    assert.equal(f.defaults.AI_FORCE_LOCAL, 'true');
    assert.equal(f.defaults.AI_ALLOW_REMOTE, 'false');
    assert.ok(Number(f.defaults.AI_GLOBAL_DAILY_CAP) <= 40);
    assert.ok(Number(f.defaults.AI_SOFT_STOP_PERCENT) <= 50);
    assert.equal(f.includedDailyCaps.grok, 0);
    assert.equal(f.includedDailyCaps['cursor-cloud'], 0);
  });

  it('self-improve + recurrent workflows force local forfait', () => {
    for (const rel of [
      '.github/workflows/self-improve.yml',
      '.github/workflows/recurrent-orchestrator.yml',
    ]) {
      const yml = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.match(yml, /AI_FORCE_LOCAL:\s*['"]?true['"]?/i);
      assert.match(yml, /AI_ALLOW_REMOTE:\s*['"]?false['"]?/i);
      assert.match(yml, /local-auto-improve-orchestrator/);
    }
  });

  it('orchestrator hard-codes local env and refuses remote AI helpers', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'tools/ci/local-auto-improve-orchestrator.js'),
      'utf8'
    );
    assert.match(src, /AI_FORCE_LOCAL:\s*'true'/);
    assert.match(src, /AI_ALLOW_REMOTE:\s*'false'/);
    assert.doesNotMatch(src, /ai-helper|callAI|OPENROUTER/);
  });

  it('gate script passes after forfait inject', () => {
    const r = spawnSync(
      process.execPath,
      [path.join(ROOT, 'tools/ci/p2542-local-auto-improve-gate.js')],
      { cwd: ROOT, encoding: 'utf8' }
    );
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });

  it('Homey LocalSelfImproveCatalog is zero-cloud', () => {
    const cat = require(path.join(ROOT, 'lib/features/LocalSelfImproveCatalog.js'));
    const pol = cat.assertNoRemoteAiPolicy();
    assert.equal(pol.cloudAiInHomeyRuntime, false);
    assert.equal(pol.AI_ALLOW_REMOTE, false);
    assert.ok(cat.listLocalStacks().length >= 6);
  });
});
