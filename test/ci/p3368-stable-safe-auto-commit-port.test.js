'use strict';
// P3368: stable-v5 store-text-coherence.yml (P3363) calls scripts/ci/safe-auto-commit.js,
// which only lived on master, so P2876 failed the stable-v5 test job. The script is ported
// with its dependencies; this keeps it loadable on this branch (deps present, syntax valid,
// usage error instead of a crash without arguments).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SCRIPT = path.join(ROOT, 'scripts/ci/safe-auto-commit.js');

describe('P3368 safe-auto-commit on stable-v5', () => {
  it('exists and every workflow that calls it finds it', () => {
    assert.ok(fs.existsSync(SCRIPT));
    const wf = path.join(ROOT, '.github/workflows');
    for (const f of fs.readdirSync(wf).filter((x) => /\.ya?ml$/.test(x))) {
      const src = fs.readFileSync(path.join(wf, f), 'utf8');
      if (src.includes('scripts/ci/safe-auto-commit.js')) { assert.ok(fs.existsSync(SCRIPT), f); }
    }
  });

  it('has valid syntax and its required local modules resolve', () => {
    assert.equal(spawnSync(process.execPath, ['--check', SCRIPT]).status, 0);
    const { select } = require('../../scripts/ci/rules-gates');
    assert.equal(typeof select, 'function');
    assert.ok(Array.isArray(select({ profile: 'full' })));
    assert.equal(typeof require('../../scripts/ci/push-with-retry').pushWithRetry, 'function');
  });

  it('exits with the usage code (2) when called without --id/--paths', () => {
    const r = spawnSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, GITHUB_TOKEN: '' } });
    assert.equal(r.status, 2, r.stderr);
  });
});
