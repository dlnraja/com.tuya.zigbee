'use strict';
// P3255d (t824u): bot [skip ci] data commits go to bot/data; one daily fold into master, human edits kept.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const B = require('../../scripts/ci/bot-batch');
const ROOT = path.join(__dirname, '..', '..');

const g = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', env: { ...process.env, GIT_DIR: undefined, GIT_WORK_TREE: undefined, GIT_INDEX_FILE: undefined } }).trim();
function repo() {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'p3255d-'));
  const origin = path.join(t, 'o.git'); const w = path.join(t, 'w');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'master', origin]);
  execFileSync('git', ['clone', '-q', origin, w], { stdio: 'ignore' });
  g(w, 'config', 'user.email', 't@t'); g(w, 'config', 'user.name', 't'); g(w, 'checkout', '-q', '-B', 'master');
  fs.mkdirSync(path.join(w, 'config', 'ci'), { recursive: true }); fs.mkdirSync(path.join(w, 'data', 'leads'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'config', 'ci', 'bot-batch.json'), path.join(w, 'config', 'ci', 'bot-batch.json'));
  fs.writeFileSync(path.join(w, 'data', 'leads', 'l.md'), 'a\nb\nc\nd\ne\n');
  g(w, 'add', '-A'); g(w, 'commit', '-qm', 'init'); g(w, 'push', '-q', 'origin', 'master');
  return { t, w };
}
const env = { GITHUB_ACTIONS: 'true', BOT_BATCH_TEST: '1' };

describe('P3255d bot data batching', () => {
  it('eligibility: only [skip ci] commits touching only defer paths', () => {
    const P = B.loadCfg(ROOT).deferPaths;
    assert.ok(B.eligible([{ msg: 'x [skip ci]', files: ['data/leads/a.json'] }], P));
    assert.ok(!B.eligible([{ msg: 'x', files: ['data/leads/a.json'] }], P));
    assert.ok(!B.eligible([{ msg: 'x [skip ci]', files: ['data/leads/a.json', 'app.json'] }], P));
    assert.ok(!B.eligible([], P));
  });

  it('diverts to bot/data, then one fold merges bot + human edits into master', () => {
    const { t, w } = repo();
    try {
      fs.writeFileSync(path.join(w, 'data', 'leads', 'l.md'), 'a\nb\nc\nd\nBOT\n');
      g(w, 'commit', '-qam', 'ledger [skip ci]');
      assert.strictEqual(B.divert({ cwd: w, env }).diverted, true);
      assert.ok(!g(w, 'log', 'origin/master', '--format=%s').includes('ledger'), 'master untouched');
      // a human edit on master meanwhile
      g(w, 'checkout', '-q', '-B', 'master', 'origin/master');
      fs.writeFileSync(path.join(w, 'data', 'leads', 'l.md'), 'HUMAN\nb\nc\nd\ne\n');
      g(w, 'commit', '-qam', 'human'); g(w, 'push', '-q', 'origin', 'master');
      // non-eligible commit is not diverted
      fs.writeFileSync(path.join(w, 'app.json'), '{}'); g(w, 'add', '-A'); g(w, 'commit', '-qm', 'app [skip ci]');
      assert.strictEqual(B.divert({ cwd: w, env }).diverted, false);
      g(w, 'reset', '-q', '--hard', 'origin/master');
      const r = B.fold({ cwd: w });
      assert.strictEqual(r.folded, true); assert.deepStrictEqual(r.skipped, []);
      assert.strictEqual(fs.readFileSync(path.join(w, 'data', 'leads', 'l.md'), 'utf8'), 'HUMAN\nb\nc\nd\nBOT\n');
      assert.match(g(w, 'log', '-1', '--format=%s'), /daily batch of 1 bot data commit.*\[skip ci\]/);
    } finally { fs.rmSync(t, { recursive: true, force: true }); }
  });

  it('push helpers call the divert and the fold job disables it for itself', () => {
    assert.ok(fs.readFileSync(path.join(ROOT, '.github', 'scripts', 'git-push-retry.sh'), 'utf8').includes('bot-batch.js divert'));
    assert.ok(fs.readFileSync(path.join(ROOT, 'scripts', 'ci', 'push-with-retry.js'), 'utf8').includes("require('./bot-batch')"));
    const wf = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'bot-data-fold.yml'), 'utf8');
    assert.match(wf, /BOT_BATCH: '0'/); assert.match(wf, /force-with-lease/);
  });
});
