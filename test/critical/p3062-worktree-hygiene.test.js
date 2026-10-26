'use strict';
// P3062: the temp-worktree guard only removes clean, pushed, old worktrees in scope, bounded by --max.
const { after, before, describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const H = require('../../tools/ci/worktree-hygiene');

function sh(cwd, ...args) { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); }

describe('P3062 worktree hygiene guard', () => {
  let tmp; let repo; let remote; let scope;
  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3062-wth-'));
    remote = path.join(tmp, 'remote.git'); repo = path.join(tmp, 'repo'); scope = path.join(tmp, 'scope');
    fs.mkdirSync(scope);
    sh(tmp, 'init', '-q', '--bare', remote);
    sh(tmp, 'init', '-q', repo);
    sh(repo, 'config', 'user.email', 't@t'); sh(repo, 'config', 'user.name', 't');
    fs.writeFileSync(path.join(repo, 'a.txt'), 'a');
    sh(repo, 'add', '.'); sh(repo, 'commit', '-q', '-m', 'a');
    sh(repo, 'remote', 'add', 'origin', remote); sh(repo, 'push', '-q', 'origin', 'HEAD:refs/heads/main');
    sh(repo, 'fetch', '-q', 'origin');
    sh(repo, 'worktree', 'add', '-q', '--detach', path.join(scope, 'clean'), 'HEAD');
    sh(repo, 'worktree', 'add', '-q', '--detach', path.join(scope, 'dirty'), 'HEAD');
    fs.writeFileSync(path.join(scope, 'dirty', 'b.txt'), 'b');
    sh(repo, 'worktree', 'add', '-q', '-b', 'local-only', path.join(scope, 'unpushed'), 'HEAD');
    fs.writeFileSync(path.join(scope, 'unpushed', 'c.txt'), 'c');
    sh(path.join(scope, 'unpushed'), 'add', '.'); sh(path.join(scope, 'unpushed'), 'commit', '-q', '-m', 'c');
  });
  after(() => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_e) { /* */ } });

  it('parses porcelain output', () => {
    const l = H.parsePorcelain('worktree /a\nHEAD abc\nbranch refs/heads/x\n\nworktree /b\nHEAD def\ndetached\nlocked\n');
    assert.strictEqual(l.length, 2);
    assert.strictEqual(l[0].branch, 'refs/heads/x');
    assert.strictEqual(l[1].locked, true);
  });

  it('dry-run removes nothing; apply removes only the clean pushed worktree; branches kept', () => {
    const opts = { repo, apply: false, max: 20, minAgeHours: 0, roots: [scope], prefixes: [] };
    const dry = H.run(opts);
    assert.deepStrictEqual(dry.removed.map((x) => path.basename(x.path)), ['clean']);
    assert.ok(fs.existsSync(path.join(scope, 'clean')));
    const reasons = Object.fromEntries(dry.kept.map((k) => [path.basename(k.path), k.reason]));
    assert.strictEqual(reasons.dirty, 'uncommitted changes');
    assert.strictEqual(reasons.unpushed, 'HEAD not on any remote');
    assert.strictEqual(reasons.repo, 'main checkout');
    const real = H.run({ ...opts, apply: true });
    assert.strictEqual(real.removed.length, 1);
    assert.ok(!fs.existsSync(path.join(scope, 'clean')));
    assert.ok(fs.existsSync(path.join(scope, 'dirty')));
    assert.ok(sh(repo, 'branch', '--list', 'local-only').includes('local-only'));
  });

  it('respects min age and the max bound', () => {
    sh(repo, 'worktree', 'add', '-q', '--detach', path.join(scope, 'fresh'), 'HEAD');
    const young = H.run({ repo, apply: false, max: 20, minAgeHours: 1, roots: [scope], prefixes: [] });
    assert.strictEqual(young.removed.length, 0);
    const capped = H.run({ repo, apply: false, max: 0, minAgeHours: 0, roots: [scope], prefixes: [] });
    assert.strictEqual(capped.removed.length, 0);
    assert.ok(capped.kept.some((k) => k.reason === 'max reached'));
  });
});
