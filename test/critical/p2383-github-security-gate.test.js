'use strict';

/**
 * P2383 — GitHub security elementary gate regression.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const GATE = path.join(ROOT, 'tools/ci/github-security-elementary-gate.js');

describe('P2383 GitHub security elementary gate', () => {
  it('gate source enforces bash defaults + no write-all + checkout v4+', () => {
    const src = fs.readFileSync(GATE, 'utf8');
    assert.match(src, /P2383/);
    assert.match(src, /defaults\.run\.shell: bash/);
    assert.match(src, /write-all forbidden/);
    assert.match(src, /checkout must be @v4 or @v5/);
    assert.match(src, /timeout-minutes/);
  });

  it('gate exits 0 on current workflows', () => {
    const r = spawnSync(process.execPath, [GATE], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /PASS:/);
  });

  it('fleet-intelligent-enrich uses setup-node@v5 and verified push', () => {
    const yml = fs.readFileSync(
      path.join(ROOT, '.github/workflows/fleet-intelligent-enrich.yml'),
      'utf8',
    );
    assert.match(yml, /actions\/setup-node@v5/);
    assert.doesNotMatch(yml, /git push origin HEAD:master \|\| true/);
  });
});
