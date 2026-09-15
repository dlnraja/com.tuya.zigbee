'use strict';

/**
 * P2521 — CI workflow heal Contre quoi
 * - align-mfs writes compact mfs_db (no pretty-print CI churn)
 * - syntax-check / unified-ci hardened steps present
 * - fingerprint baseline + prune --check green
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');

describe('P2521 workflow CI heal — compact mfs + collision baseline', () => {
  it('align-mfs-db-intelligent writes compact JSON.stringify(db) not pretty', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/align-mfs-db-intelligent.js'), 'utf8');
    assert.ok(/JSON\.stringify\(db\)/.test(src), 'must compact-write db');
    assert.ok(!/JSON\.stringify\(db,\s*null,\s*2\)/.test(src), 'must not pretty-print full mfs_db');
  });

  it('syntax-check has P169 mfs align step; unified-ci has prune remediation', () => {
    const syn = fs.readFileSync(path.join(ROOT, '.github/workflows/syntax-check.yml'), 'utf8');
    assert.ok(syn.includes('align-mfs-db-intelligent.js --check'));
    assert.ok(syn.includes('pretty-printed') || syn.includes('P2521'));
    const uni = fs.readFileSync(path.join(ROOT, '.github/workflows/unified-ci.yml'), 'utf8');
    assert.ok(uni.includes('prune-fp-collision-bleed.js'));
    assert.ok(uni.includes('fingerprint-collision-baseline.json'));
    assert.ok(uni.includes('Still NEW collisions after prune') || uni.includes('P2521'));
  });

  it('mfs_db is compact (few lines) and align --check exits 0', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'data/mfs_db.json'), 'utf8');
    const lines = raw.trim().split(/\n/).length;
    assert.ok(lines <= 5, `mfs_db should be compact, got ${lines} lines`);
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/ci/align-mfs-db-intelligent.js'), '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60000,
    });
    assert.strictEqual(r.status, 0, r.stderr || r.stdout);
  });

  it('prune-fp-collision-bleed --check is green after baseline refresh', () => {
    const r = spawnSync(process.execPath, [path.join(ROOT, 'tools/ci/prune-fp-collision-bleed.js'), '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120000,
    });
    assert.strictEqual(r.status, 0, r.stderr || r.stdout);
  });
});
