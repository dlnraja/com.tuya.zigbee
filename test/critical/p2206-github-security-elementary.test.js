'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const GATE = path.join(ROOT, 'tools/ci/github-security-elementary-gate.js');

describe('P2206 github security elementary gate', () => {
  it('passes on current tree (no leaky tracked dumps)', () => {
    const r = spawnSync(process.execPath, [GATE], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /PASS/);
  });

  it('staged mode exits 0 when nothing leaky is staged', () => {
    const r = spawnSync(process.execPath, [GATE, '--staged'], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  });
});
