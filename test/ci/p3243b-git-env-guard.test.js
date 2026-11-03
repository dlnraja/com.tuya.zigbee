'use strict';
/* eslint-env mocha */
// P3243b guard: hook git env never reaches a test, and a fixture `git init` never touches the real repo config.
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');

describe('P3243b git env guard', () => {
  it('no GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE inside mocha', () => {
    for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE']) assert.strictEqual(process.env[k], undefined, k);
  });
  it('full-suite runners strip hook git env too', () => {
    for (const f of ['tools/ci/mocha-flaky-retry.js', 'tools/ci/node-test-strict.js', 'test/setup/host-env.js']) {
      if (fs.existsSync(path.join(ROOT, f))) assert.match(fs.readFileSync(path.join(ROOT, f), 'utf8'), /P3243b[\s\S]*delete process\.env\[k\]/, f);
    }
  });
  it('pre-push full suite runs with hook git env removed', () => {
    const f = path.join(ROOT, '.githooks/pre-push');
    if (fs.existsSync(f)) assert.match(fs.readFileSync(f, 'utf8'), /env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE[^\n]*mocha-flaky-retry/);
  });
  it('a fixture git init leaves the real repo non-bare without core.worktree', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3243b-'));
    try {
      execFileSync('git', ['init', '-q', '--bare', path.join(tmp, 'r.git')], { stdio: 'pipe' });
      execFileSync('git', ['init', '-q', path.join(tmp, 'w')], { stdio: 'pipe' });
      let bare = 'false';
      try { bare = execFileSync('git', ['rev-parse', '--is-bare-repository'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (_) { return; } // not a checkout (tarball)
      assert.strictEqual(bare, 'false');
      let wt = '';
      try { wt = execFileSync('git', ['config', '--get', 'core.worktree'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (_) { wt = ''; }
      assert.strictEqual(wt, '', 'core.worktree must not be set in the shared repo config');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  });
});
