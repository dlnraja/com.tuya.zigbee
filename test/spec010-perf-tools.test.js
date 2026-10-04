'use strict';
// Spec 010 / T1: the perf baseline tools run and the golden couple snapshot still holds
// (no driver lost couples). Runs the scripts in child processes so no lib module is loaded here.
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const run = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', timeout: 120000 });

describe('spec 010 perf tools', function () {
  this.timeout(150000);
  it('golden couple snapshot: no driver lost couples', () => {
    const r = run(['scripts/perf/golden-couples.js', '--check']);
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /lost=0/);
  });
  it('boot-heap harness loads every driver module without errors', () => {
    const r = run(['scripts/perf/boot-heap.js']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /loadErrors=0/);
  });
});
