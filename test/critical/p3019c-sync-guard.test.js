'use strict';

/**
 * P3019c: shared cross-branch guard — identical on master, stable-v5 and bastien-home.
 * Per-branch KB docs are never synced; the stable↔master safe-sync uses the same guard.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const shared = require('../../tools/ci/branch-specific-paths.js');

describe('P3019c shared branch-specific guard', () => {
  it('lists the per-branch KB docs', () => {
    for (const p of [
      'docs/knowledge/KB/METHOD_COVERAGE.md',
      'docs/knowledge/KB/CROSS_APP_METHODS.md',
      'docs/knowledge/KB/UNKNOWN_COMMANDS.md',
      'docs/knowledge/KB/DP_ENDPOINT_COVERAGE.md',
    ]) {
      assert.ok(shared.BRANCH_SPECIFIC_PATHS.includes(p), p);
      assert.strictEqual(shared.isBranchSpecific(p), true, p);
    }
    assert.strictEqual(shared.isBranchSpecific('docs/knowledge/KB/lessons.md'), false);
    assert.strictEqual(shared.isBranchSpecific('lib/zigbee/MethodCoverage.js'), false);
  });

  it('regenerators only target branch-specific outputs and skip missing scripts', () => {
    for (const r of shared.REGENERATORS) {
      for (const o of r.outputs) {
        assert.strictEqual(shared.isBranchSpecific(o), true, o);
      }
    }
    const res = shared.regenerateBranchDocs(path.join(ROOT, 'no-such-tree'), { execFileSync: () => '' });
    assert.deepStrictEqual(res, { ran: [], changed: [] });
  });

  it('stable↔master safe-sync filters through the guard', () => {
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/apply-safe-sync.js'), 'utf8');
    assert.match(src, /require\('\.\/branch-specific-paths'\)/);
    assert.match(src, /SAFE_FILES\.filter\(\(x\) => !isBranchSpecific\(x\)\)/);
  });
});
