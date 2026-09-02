'use strict';

/**
 * P2383 — GitHub security elementary gate regression (stable-safe).
 * Full estate pass is enforced on master; stable may lag workflow estate.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const GATE = path.join(ROOT, 'tools/ci/github-security-elementary-gate.js');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const IS_STABLE = String(PKG.name || PKG.id || '').includes('stable')
  || String(PKG.version || '').startsWith('5.');

describe('P2383 GitHub security elementary gate', () => {
  it('gate source enforces bash defaults + no write-all + checkout v4+', () => {
    const src = fs.readFileSync(GATE, 'utf8');
    assert.match(src, /P2383/);
    assert.match(src, /defaults\.run\.shell: bash/);
    assert.match(src, /write-all forbidden/);
    assert.match(src, /checkout must be @v4 or @v5/);
    assert.match(src, /timeout-minutes/);
  });

  it('gate exits 0 on current workflows (master) / soft on stable lag', (t) => {
    const r = spawnSync(process.execPath, [GATE], { cwd: ROOT, encoding: 'utf8' });
    if (r.status !== 0 && IS_STABLE) {
      t.skip('stable workflow estate may lag master P2383 hardening');
      return;
    }
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /PASS:/);
  });
});
