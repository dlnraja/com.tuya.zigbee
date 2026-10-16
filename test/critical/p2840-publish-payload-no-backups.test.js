'use strict';

/**
 * P2840 Contre quoi: root backups/ (~12 MB app.json dumps) must never ship in
 * Homey payload — Athom socket hang up / processing_failed.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2840 publish payload excludes backups/', () => {
  it('.homeyignore lists backups', () => {
    const ignore = fs.readFileSync(path.join(ROOT, '.homeyignore'), 'utf8');
    assert.match(ignore, /^backups\s*$/m);
    assert.match(ignore, /P2840/);
  });

  it('publish-size-gate fails closed on .homeybuild/backups', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/ci/publish-size-gate.cjs'), 'utf8');
    assert.match(src, /Build contains backups/);
    assert.match(src, /P2840/);
    assert.match(src, /excludedDirs:\s*\[[^\]]*['"]backups['"]/);
  });

  it('prepare-publish still trims backups/ as defense-in-depth', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/prepare-publish.js'), 'utf8');
    assert.match(src, /['"]backups['"]/);
    assert.match(src, /inflate Athom payload/);
  });

  it('backups/ is not tracked in git (payload bloat)', () => {
    const { execSync } = require('child_process');
    let out = '';
    try {
      out = execSync('git ls-files backups', { cwd: ROOT, encoding: 'utf8' }).trim();
    } catch {
      out = '';
    }
    assert.equal(out, '', `tracked under backups/: ${out}`);
  });
});
