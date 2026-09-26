'use strict';
/**
 * P2749f — Athom publish Contre quoi: titleFormatted must include [[args]]
 * Dual-app: BOTH (CI)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

describe('P2749f flow titleFormatted args gate', () => {
  it('gate script exists and is wired in package.json + auto-publish', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'tools/ci/flow-titleformatted-args-gate.js')));
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:flow-titleformatted']);
    const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
    assert.ok(/check:flow-titleformatted/.test(yml));
    const e2e = fs.readFileSync(path.join(ROOT, '.github/workflows/e2e-dashboard-test.yml'), 'utf8');
    assert.ok(/flow-titleformatted-args-gate/.test(e2e));
  });

  it('gate exits 0 on current fleet', () => {
    const r = spawnSync(process.execPath, ['tools/ci/flow-titleformatted-args-gate.js'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
  });
});
