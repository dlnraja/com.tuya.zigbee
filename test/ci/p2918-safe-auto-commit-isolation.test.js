'use strict';
// P2918: safe-auto-commit judges the staged change alone; unrelated unstaged edits left by
// earlier steps of the same job are set aside during the gate and restored afterwards.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');

function sh(cwd, ...args) { return execFileSync('git', args, { cwd, encoding: 'utf8' }); }

describe('P2918 safe-auto-commit gate isolation', function () {
  this.timeout(30000);
  let dir; let work;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p2918-'));
    const origin = path.join(dir, 'origin.git');
    work = path.join(dir, "work");
    execFileSync('git', ['init', '-q', '--bare', '-b', 'master', origin]);
    execFileSync('git', ['init', '-q', '-b', 'master', work]);
    fs.cpSync(path.join(ROOT, 'scripts/ci'), path.join(work, 'scripts/ci'), { recursive: true });
    fs.mkdirSync(path.join(work, 'tools/ci'), { recursive: true });
    // Stub gate: red when the switch compose carries an unsynced marker.
    fs.writeFileSync(path.join(work, 'tools/ci/compose-appjson-fingerprint-sync-gate.js'),
      "const t=require('fs').readFileSync('drivers/sw/driver.compose.json','utf8');process.exit(t.includes('DRIFT')?1:0);\n");
    fs.mkdirSync(path.join(work, 'drivers/sw'), { recursive: true });
    fs.writeFileSync(path.join(work, 'drivers/sw/driver.compose.json'), '{"a":1}\n');
    fs.mkdirSync(path.join(work, 'data/leads'), { recursive: true });
    fs.writeFileSync(path.join(work, 'data/leads/x.json'), '{"n":1}\n');
    sh(work, 'config', 'user.name', 't'); sh(work, 'config', 'user.email', 't@t');
    sh(work, 'add', '-A'); sh(work, 'commit', '-qm', 'base');
    sh(work, 'remote', 'add', 'origin', origin); sh(work, 'push', '-q', 'origin', 'master');
  });
  after(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) { /* ignore */ } });

  it('accepts a data-only change while an unrelated compose drift sits in the tree, and keeps the drift', function () {
    fs.writeFileSync(path.join(work, 'data/leads/x.json'), '{"n":2}\n');
    fs.writeFileSync(path.join(work, 'drivers/sw/driver.compose.json'), '{"a":"DRIFT"}\n');
    const r = spawnSync(process.execPath, ['scripts/ci/safe-auto-commit.js', '--id=t', '--paths=data/leads/x.json', '--dry'],
      { cwd: work, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '', GITHUB_OUTPUT: '', GITHUB_TOKEN: '', GITHUB_EVENT_NAME: 'workflow_dispatch' } });
    const out = (r.stdout || '') + (r.stderr || '');
    assert.match(out, /DRY: gate OK/, out);
    assert.ok(fs.readFileSync(path.join(work, 'drivers/sw/driver.compose.json'), 'utf8').includes('DRIFT'), 'drift restored');
    assert.strictEqual(sh(work, 'stash', 'list').trim(), '', 'no stash left behind');
  });
});
