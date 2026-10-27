'use strict';
// P3025b: git-push-retry.sh --tag (publish.yml used `git push -f <tag>`) and --prefer-remote
// (auto-publish-on-push.yml used `rebase -X ours` + raw push loop). Tags are never forced.
const { describe, it, before, after } = require('../_support/dual-runner'); // P3020
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawn } = require('child_process');

const HELPER = path.resolve(__dirname, '../../.github/scripts/git-push-retry.sh');
const ENV = { ...process.env, PUSH_RETRY_BASE_S: '0', PUSH_RETRY_JITTER_S: '1', PUSH_RETRY_ATTEMPTS: '6', GIT_TERMINAL_PROMPT: '0' };
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();
function clone(dir, origin, name) {
  const w = path.join(dir, name);
  execFileSync('git', ['clone', '-q', origin, w]);
  git(w, 'config', 'user.name', name); git(w, 'config', 'user.email', `${name}@t`);
  return w;
}
function run(cwd, args = []) {
  return new Promise((resolve) => {
    const p = spawn('bash', [HELPER, '--branch', 'master', ...args], { cwd, env: ENV });
    let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    // P3075: a stuck helper is killed before the mocha timeout so the failure shows its log.
    const guard = setTimeout(() => { out += '\n[P3075] helper killed after 100 s'; p.kill('SIGKILL'); }, 100000);
    p.on('close', (code) => { clearTimeout(guard); resolve({ code, out }); });
  });
}
const remoteRef = (w, ref) => git(w, 'ls-remote', 'origin', ref).split(/\s/)[0] || '';

describe('P3025b git-push-retry.sh --tag / --prefer-remote', function () {
  this.timeout(120000); // P3075: 60 s timed out under full-suite CI load (local repos, no network)
  let dir; let origin;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3025b-'));
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

  it('pushes the tag on the REBASED commit that is really on the remote (not the pre-rebase one)', async () => {
    const a = clone(dir, origin, 'ta'); const b = clone(dir, origin, 'tb');
    fs.writeFileSync(path.join(b, 'other.txt'), 'b\n'); git(b, 'add', '-A'); git(b, 'commit', '-qm', 'concurrent');
    git(b, 'push', '-q', 'origin', 'master');
    fs.writeFileSync(path.join(a, 'v.txt'), '1\n'); git(a, 'add', '-A'); git(a, 'commit', '-qm', 'v1 [skip ci]');
    git(a, 'tag', '-f', 'v1.0.1');
    const preRebase = git(a, 'rev-parse', 'HEAD');
    const r = await run(a, ['--tag', 'v1.0.1']);
    assert.strictEqual(r.code, 0, r.out);
    const head = remoteRef(a, 'refs/heads/master');
    assert.notStrictEqual(head, preRebase);
    assert.strictEqual(remoteRef(a, 'refs/tags/v1.0.1'), head);
  });

  it('second run with the same tag on the same commit is a no-op success', async () => {
    const a = path.join(dir, 'ta');
    const r = await run(a, ['--tag', 'v1.0.1']);
    assert.strictEqual(r.code, 0, r.out);
    assert.match(r.out, /tag v1\.0\.1 already on origin/);
  });

  it('never moves an existing remote tag that points elsewhere (warning, exit 0, remote unchanged)', async () => {
    const c = clone(dir, origin, 'tc');
    const before = remoteRef(c, 'refs/tags/v1.0.1');
    fs.writeFileSync(path.join(c, 'c.txt'), 'c\n'); git(c, 'add', '-A'); git(c, 'commit', '-qm', 'c');
    const r = await run(c, ['--tag', 'v1.0.1']);
    assert.strictEqual(r.code, 0, r.out);
    assert.match(r.out, /::warning::git-push-retry: tag v1\.0\.1 already exists/);
    assert.strictEqual(remoteRef(c, 'refs/tags/v1.0.1'), before);
  });

  it('--prefer-remote keeps the upstream version on conflict (old rebase -X ours)', async () => {
    const a = clone(dir, origin, 'ra'); const b = clone(dir, origin, 'rb');
    fs.writeFileSync(path.join(a, 'shared.txt'), 'upstream\n'); git(a, 'commit', '-qam', 'up'); git(a, 'push', '-q', 'origin', 'master');
    fs.writeFileSync(path.join(b, 'shared.txt'), 'bot\n');
    fs.writeFileSync(path.join(b, 'meta.json'), '{}\n'); git(b, 'add', '-A'); git(b, 'commit', '-qm', 'bot meta');
    const r = await run(b, ['--prefer-remote']);
    assert.strictEqual(r.code, 0, r.out);
    const check = clone(dir, origin, 'rcheck');
    assert.strictEqual(fs.readFileSync(path.join(check, 'shared.txt'), 'utf8'), 'upstream\n');
    assert.ok(fs.existsSync(path.join(check, 'meta.json')), 'non-conflicting bot change still lands');
  });
});
