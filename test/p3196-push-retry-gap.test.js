'use strict';
/* eslint-env mocha */
// P3196: git-push-retry re-checks the 15-min master gap after fetch/rebase and waits instead of pushing.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const SCRIPT = path.join(__dirname, '..', '.github', 'scripts', 'git-push-retry.sh');

describe('P3196 git-push-retry master gap', function () {
  this.timeout(20000);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3196-'));
  after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const sh = (c, cwd) => execSync(c, { cwd, stdio: 'pipe', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).toString();
  before(() => {
    sh('git init -q --bare remote.git && git init -q -b master work', tmp);
    const w = path.join(tmp, 'work');
    sh('git commit -q --allow-empty -m a && git remote add origin ../remote.git && git push -q origin master && git checkout -q -b dev && git push -q origin dev && git checkout -q master && git commit -q --allow-empty -m b && git checkout -q dev && git commit -q --allow-empty -m c', w);
    fs.mkdirSync(path.join(tmp, 'bin'));
    // stub sleep: record the wait, then stop the script (a real run would wait and re-check)
    fs.writeFileSync(path.join(tmp, 'bin', 'sleep'), `#!/bin/sh\necho "$1" > ${tmp}/slept\nkill $PPID\n`, { mode: 0o755 });
  });
  const run = (branch) => spawnSync('bash', [SCRIPT, '--branch', branch, '--attempts', '1'], { cwd: path.join(tmp, 'work'), env: { ...process.env, GITHUB_ACTIONS: '', PUSH_RETRY_MIN_GAP_MIN: '15', PATH: `${tmp}/bin:${process.env.PATH}` } });
  it('waits (no push) when master tip is < 15 min old', () => {
    sh('git checkout -q master', path.join(tmp, 'work'));
    run('master');
    assert.ok(Number(fs.readFileSync(path.join(tmp, 'slept'), 'utf8')) > 800);
    assert.notStrictEqual(sh('git rev-parse origin/master', path.join(tmp, 'work')).trim(), sh('git rev-parse master', path.join(tmp, 'work')).trim());
  });
  it('other branches are not gated', () => {
    sh('git checkout -q dev', path.join(tmp, 'work'));
    assert.strictEqual(run('dev').status, 0);
  });
});
