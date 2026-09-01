'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');

describe('P2376 intelligent source diff', () => {
  it('runs plan mode without blocking', () => {
    const res = spawnSync(process.execPath, ['tools/ci/intelligent-source-diff.js', '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
    });
    assert.equal(res.status, 0, res.stderr || res.stdout);
    const summary = JSON.parse(res.stdout);
    assert.equal(summary.ok, true);
    assert.ok(Array.isArray(summary.plan));
    assert.ok(summary.projectFingerprint);
  });

  it('registry exists with optional external sources', () => {
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/enrichment/source-registry.json'), 'utf8'));
    const z2m = reg.sources.find((s) => s.id === 'z2m');
    assert.ok(z2m);
    assert.equal(z2m.optional, true);
    assert.equal(z2m.blockPipeline, false);
  });
});
