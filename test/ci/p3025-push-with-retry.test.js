'use strict';
// P3025: node push loop used by safe-auto-commit — fetch blips are retried (not reported as a conflict),
// concurrent pushers all land, real conflicts abort cleanly, backoff is exponential + bounded.
const { describe, it, before, after } = require('../_support/dual-runner'); // P3020
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pushWithRetry, backoffMs } = require('../../scripts/ci/push-with-retry');

const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();
const noSleep = async () => {};

describe('P3025 push-with-retry (safe-auto-commit)', function () {
  this.timeout(60000);
  let dir; let origin;
  const clone = (n) => { const w = path.join(dir, n); execFileSync('git', ['clone', '-q', origin, w]); git(w, 'config', 'user.name', n); git(w, 'config', 'user.email', `${n}@t`); return w; };
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3025n-'));
    origin = path.join(dir, 'o.git');
    execFileSync('git', ['init', '-q', '--bare', '-b', 'master', origin]);
    const s = path.join(dir, 's'); execFileSync('git', ['init', '-q', '-b', 'master', s]);
    git(s, 'config', 'user.name', 's'); git(s, 'config', 'user.email', 's@t');
    fs.writeFileSync(path.join(s, 'f.txt'), 'base\n'); git(s, 'add', '-A'); git(s, 'commit', '-qm', 'base');
    git(s, 'remote', 'add', 'origin', origin); git(s, 'push', '-q', 'origin', 'master');
  });
  after(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* ignore */ } });

  it('backoff is exponential, capped and jittered', () => {
    assert.strictEqual(backoffMs(1, { rnd: () => 0 }), 4000);
    assert.strictEqual(backoffMs(3, { rnd: () => 0 }), 16000);
    assert.strictEqual(backoffMs(10, { rnd: () => 0 }), 60000);
    assert.ok(backoffMs(1, { rnd: () => 0.99 }) < 4000 + 7000);
  });

  it('rebases behind a concurrent push and lands both commits', async () => {
    const a = clone('a'); const b = clone('b');
    fs.writeFileSync(path.join(a, 'a.json'), '1'); git(a, 'add', '-A'); git(a, 'commit', '-qm', 'a');
    fs.writeFileSync(path.join(b, 'b.json'), '1'); git(b, 'add', '-A'); git(b, 'commit', '-qm', 'b');
    const [ra, rb] = await Promise.all([pushWithRetry({ branch: 'master', cwd: a, sleep: noSleep }), pushWithRetry({ branch: 'master', cwd: b, sleep: noSleep })]);
    assert.ok(ra.ok && rb.ok, JSON.stringify([ra, rb]));
    const c = clone('c'); assert.ok(fs.existsSync(path.join(c, 'a.json')) && fs.existsSync(path.join(c, 'b.json')));
  });

  it('retries a failed fetch instead of reporting a conflict', async () => {
    const w = clone('w'); fs.writeFileSync(path.join(w, 'w.json'), '1'); git(w, 'add', '-A'); git(w, 'commit', '-qm', 'w');
    let n = 0; const real = (...a) => require('child_process').spawnSync('git', a, { cwd: w, encoding: 'utf8' });
    const flaky = (...a) => (a[0] === 'fetch' && n++ === 0 ? { status: 128, stderr: 'fatal: unable to access: 502' } : real(...a));
    const r = await pushWithRetry({ branch: 'master', cwd: w, git: flaky, sleep: noSleep });
    assert.deepStrictEqual([r.ok, r.reason, r.attempts], [true, 'pushed', 2]);
  });

  it('stops on a real conflict with the rebase aborted and nothing pushed', async () => {
    const a = clone('x'); const b = clone('y');
    fs.writeFileSync(path.join(a, 'f.txt'), 'x\n'); git(a, 'commit', '-qam', 'x');
    fs.writeFileSync(path.join(b, 'f.txt'), 'y\n'); git(b, 'commit', '-qam', 'y');
    assert.ok((await pushWithRetry({ branch: 'master', cwd: a, sleep: noSleep })).ok);
    const r = await pushWithRetry({ branch: 'master', cwd: b, sleep: noSleep });
    assert.strictEqual(r.reason, 'conflict');
    assert.ok(!fs.existsSync(path.join(b, '.git', 'rebase-merge')));
    assert.strictEqual(git(b, 'ls-remote', 'origin', 'refs/heads/master').split(/\s/)[0], git(a, 'rev-parse', 'HEAD'));
  });

  it('is bounded: exhausted after N attempts on an unreachable remote', async () => {
    const w = clone('z'); git(w, 'remote', 'set-url', 'origin', path.join(dir, 'nope.git'));
    const r = await pushWithRetry({ branch: 'master', cwd: w, attempts: 3, sleep: noSleep });
    assert.deepStrictEqual([r.ok, r.reason, r.attempts], [false, 'exhausted', 3]);
  });
});
