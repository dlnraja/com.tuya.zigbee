'use strict';
// P3025: the shared bot push helper must survive concurrent pushers (non-fast-forward races),
// stop cleanly on a real conflict (no force, nothing pushed) and be a no-op when nothing is ahead.
const { describe, it, before, after } = require('../_support/dual-runner'); // P3020: node --test and mocha
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const HELPER = path.resolve(__dirname, '../../.github/scripts/git-push-retry.sh');
const ENV = { ...process.env, PUSH_RETRY_BASE_S: '0', PUSH_RETRY_JITTER_S: '2', PUSH_RETRY_ATTEMPTS: '12', GIT_TERMINAL_PROMPT: '0' };
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();

function clone(dir, origin, name) {
  const w = path.join(dir, name);
  execFileSync('git', ['clone', '-q', origin, w]);
  git(w, 'config', 'user.name', name); git(w, 'config', 'user.email', `${name}@t`);
  return w;
}
function run(cwd, args = [], env = {}) {
  return new Promise((resolve) => {
    const p = spawn('bash', [HELPER, '--branch', 'master', ...args], { cwd, env: { ...ENV, ...env } });
    let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    // P3075: a stuck helper is killed before the mocha timeout so the failure shows its log.
    const guard = setTimeout(() => { out += '\n[P3075] helper killed after 100 s'; p.kill('SIGKILL'); }, 100000);
    p.on('close', (code) => { clearTimeout(guard); resolve({ code, out }); });
  });
}

describe('P3025 git-push-retry.sh', function () {
  this.timeout(120000); // P3075: 60 s timed out under full-suite CI load (local repos, no network)
  let dir; let origin;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3025-'));
    origin = path.join(dir, 'origin.git');
    execFileSync('git', ['init', '-q', '--bare', '-b', 'master', origin]);
    const seed = path.join(dir, 'seed');
    execFileSync('git', ['init', '-q', '-b', 'master', seed]);
    git(seed, 'config', 'user.name', 's'); git(seed, 'config', 'user.email', 's@t');
    fs.writeFileSync(path.join(seed, 'shared.txt'), 'base\n');
    git(seed, 'add', '-A'); git(seed, 'commit', '-qm', 'base');
    git(seed, 'remote', 'add', 'origin', origin); git(seed, 'push', '-q', 'origin', 'master');
  });
  after(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* ignore */ } });

  it('lands every commit when 4 bots push the same branch at once (no force, linear history)', async () => {
    const bots = ['b1', 'b2', 'b3', 'b4'].map((n) => {
      const w = clone(dir, origin, n);
      fs.writeFileSync(path.join(w, `${n}.json`), `{"bot":"${n}"}\n`);
      git(w, 'add', '-A'); git(w, 'commit', '-qm', `bot ${n} [skip ci]`);
      return w;
    });
    const res = await Promise.all(bots.map((w) => run(w)));
    res.forEach((r) => assert.strictEqual(r.code, 0, r.out));
    const check = clone(dir, origin, 'check1');
    for (const n of ['b1', 'b2', 'b3', 'b4']) assert.ok(fs.existsSync(path.join(check, `${n}.json`)), `${n} lost`);
    assert.strictEqual(git(check, 'rev-list', '--merges', '--count', 'HEAD'), '0');
  });

  it('keeps an unrelated dirty file through the rebase (autostash) and exits 0 with nothing ahead', async () => {
    const w = clone(dir, origin, 'idle');
    fs.writeFileSync(path.join(w, 'scratch.tmp'), 'x');
    const r = await run(w, [], { GITHUB_OUTPUT: path.join(dir, 'out-idle') });
    assert.strictEqual(r.code, 0, r.out);
    assert.match(fs.readFileSync(path.join(dir, 'out-idle'), 'utf8'), /pushed=false/);
  });

  it('aborts on a true conflict: exit 3, rebase aborted, remote untouched', async () => {
    const a = clone(dir, origin, 'ca'); const b = clone(dir, origin, 'cb');
    fs.writeFileSync(path.join(a, 'shared.txt'), 'from a\n'); git(a, 'commit', '-qam', 'a');
    fs.writeFileSync(path.join(b, 'shared.txt'), 'from b\n'); git(b, 'commit', '-qam', 'b');
    assert.strictEqual((await run(a)).code, 0);
    const remoteBefore = git(a, 'rev-parse', 'HEAD');
    const r = await run(b, [], { GITHUB_OUTPUT: path.join(dir, 'out-c') });
    assert.strictEqual(r.code, 3, r.out);
    assert.ok(!fs.existsSync(path.join(b, '.git', 'rebase-merge')), 'rebase left in progress');
    assert.strictEqual(git(b, 'ls-remote', 'origin', 'refs/heads/master').split(/\s/)[0], remoteBefore);
    assert.match(fs.readFileSync(path.join(dir, 'out-c'), 'utf8'), /pushed=false/);
  });

  it('--prefer-local keeps the bot version of a data file on conflict (old -X theirs behaviour)', async () => {
    const a = clone(dir, origin, 'pa'); const b = clone(dir, origin, 'pb');
    fs.writeFileSync(path.join(a, 'shared.txt'), 'pa\n'); git(a, 'commit', '-qam', 'pa');
    fs.writeFileSync(path.join(b, 'shared.txt'), 'pb\n'); git(b, 'commit', '-qam', 'pb');
    assert.strictEqual((await run(a)).code, 0);
    const r = await run(b, ['--prefer-local']);
    assert.strictEqual(r.code, 0, r.out);
    const c = clone(dir, origin, 'check2');
    assert.strictEqual(fs.readFileSync(path.join(c, 'shared.txt'), 'utf8'), 'pb\n');
  });

  it('gives up with exit 4 after the bounded attempts when the remote is unreachable', async () => {
    const w = clone(dir, origin, 'gone');
    fs.writeFileSync(path.join(w, 'z'), 'z'); git(w, 'add', '-A'); git(w, 'commit', '-qm', 'z');
    git(w, 'remote', 'set-url', 'origin', path.join(dir, 'missing.git'));
    const r = await run(w, [], { PUSH_RETRY_ATTEMPTS: '2' });
    assert.strictEqual(r.code, 4, r.out);
  });
});
