'use strict';
// P3025: hooks must fail LOUDLY (not silently) when node_modules is missing, and pass when deps exist.
const { describe, it, before, after } = require('../_support/dual-runner'); // P3020
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const LIB = path.resolve(__dirname, '../../.githooks/lib-deps-check.sh');
const HOOKS = path.resolve(__dirname, '../../.githooks');

describe('P3025 hook deps check', function () {
  let dir;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3025d-'));
    spawnSync('git', ['init', '-q', dir]);
    fs.mkdirSync(path.join(dir, '.githooks'));
    fs.copyFileSync(LIB, path.join(dir, '.githooks/lib-deps-check.sh'));
  });
  after(() => { fs.rmSync(dir, { recursive: true, force: true }); });
  const run = () => spawnSync('bash', ['-c', '. .githooks/lib-deps-check.sh && echo "SOURCED_OK $NODE_BIN"'],
    { cwd: dir, encoding: 'utf8', env: { ...process.env, HOOKS_AUTO_NPM_CI: '0' } });

  it('blocks with an actionable message when node_modules is missing', () => {
    const r = run();
    assert.strictEqual(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /HOOK BLOCKED \(P3025\): dependencies missing/);
    assert.match(r.stderr, /npm ci/);
    assert.doesNotMatch(r.stdout, /SOURCED_OK/);
  });

  it('passes and exports NODE_BIN when deps are installed', () => {
    fs.mkdirSync(path.join(dir, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules/.package-lock.json'), '{}');
    const r = run();
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /SOURCED_OK \S*node/);
  });

  it('pre-commit and pre-push both source the deps check; pre-push runs the CI rules-gates core profile', () => {
    for (const h of ['pre-commit', 'pre-push']) assert.match(fs.readFileSync(path.join(HOOKS, h), 'utf8'), /lib-deps-check\.sh/);
    assert.match(fs.readFileSync(path.join(HOOKS, 'pre-push'), 'utf8'), /rules-gates\.js --profile=core/);
  });
});
