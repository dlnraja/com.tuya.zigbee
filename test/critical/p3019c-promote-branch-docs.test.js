'use strict';

/**
 * P3019c: cross-branch promote/sync must never copy per-branch generated/curated KB docs
 * (METHOD_COVERAGE.md, CROSS_APP_METHODS.md, UNKNOWN_COMMANDS.md, DP_ENDPOINT_COVERAGE.md…);
 * they are regenerated on the target branch instead.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const shared = require('../../tools/ci/branch-specific-paths.js');
const promote = require('../../tools/ci/bastien-promote-upstream.js');

const MUST = [
  'docs/knowledge/KB/METHOD_COVERAGE.md',
  'docs/knowledge/KB/CROSS_APP_METHODS.md',
  'docs/knowledge/KB/UNKNOWN_COMMANDS.md',
  'docs/knowledge/KB/DP_ENDPOINT_COVERAGE.md',
];

describe('P3019c branch-specific KB docs are never promoted', () => {
  it('exclusion list contains the four per-branch KB docs', () => {
    for (const p of MUST) {
      assert.ok(shared.BRANCH_SPECIFIC_PATHS.includes(p), p);
      assert.ok(promote.BRANCH_SPECIFIC_PATHS.includes(p), p);
      assert.strictEqual(shared.isBranchSpecific(p), true, p);
      assert.strictEqual(shared.isBranchSpecific(`./${p}`), true, p);
      assert.strictEqual(shared.isBranchSpecific(p.replace(/\//g, '\\')), true, p);
    }
  });

  it('promote treats them as neither promotable nor AUTO_SAFE', () => {
    for (const p of [...MUST, 'docs/knowledge/DEVICE_TRUTH.md', 'docs/knowledge/KB/FOO_COVERAGE.md']) {
      assert.strictEqual(promote.isBranchSpecific(p), true, p);
      assert.strictEqual(promote.isPromotable(p), false, p);
      assert.strictEqual(promote.classifyAutoSafe(p), false, p);
    }
  });

  it('other docs/knowledge files and BOTH lib stay promotable (no over-blocking)', () => {
    for (const p of ['docs/knowledge/KB/lessons.md', 'docs/knowledge/KB/INDEX.md', 'docs/knowledge/HOMEY_FIRMWARE.md']) {
      assert.strictEqual(promote.isBranchSpecific(p), false, p);
      assert.strictEqual(promote.isPromotable(p), true, p);
      assert.strictEqual(promote.classifyAutoSafe(p), true, p);
    }
    assert.strictEqual(promote.classifyAutoSafe('lib/zigbee/MethodCoverage.js'), true);
  });

  it('method-coverage.js is a regenerator whose script exists on this branch', () => {
    const g = shared.REGENERATORS.find((x) => x.script === 'scripts/kb/method-coverage.js');
    assert.ok(g);
    assert.deepStrictEqual([...g.outputs], ['docs/knowledge/KB/METHOD_COVERAGE.md']);
    assert.ok(fs.existsSync(path.join(ROOT, g.script)));
    const d = shared.REGENERATORS.find((x) => x.script === 'scripts/kb/dp-endpoint-coverage.js');
    assert.ok(d);
    assert.deepStrictEqual([...d.outputs], ['docs/knowledge/KB/DP_ENDPOINT_COVERAGE.md']);
    for (const r of shared.REGENERATORS) {
      for (const o of r.outputs) {assert.strictEqual(shared.isBranchSpecific(o), true, o);}
    }
  });

  it('regenerateAfterPromote returns only changed outputs and never throws', () => {
    assert.deepStrictEqual(promote.regenerateAfterPromote(ROOT, () => ({ changed: ['docs/knowledge/KB/METHOD_COVERAGE.md'] })),
      ['docs/knowledge/KB/METHOD_COVERAGE.md']);
    assert.deepStrictEqual(promote.regenerateAfterPromote(ROOT, () => { throw new Error('boom'); }), []);
    assert.deepStrictEqual(promote.regenerateAfterPromote(ROOT, () => null), []);
  });

  it('regenerateBranchDocs runs the target tree script then reports git-dirty outputs', () => {
    const calls = [];
    const fake = (cmd, args) => {
      calls.push([cmd, ...args].join(' '));
      return cmd === 'git' ? ' M docs/knowledge/KB/METHOD_COVERAGE.md\n' : '';
    };
    const res = shared.regenerateBranchDocs(ROOT, { execFileSync: fake });
    assert.ok(res.changed.includes('docs/knowledge/KB/METHOD_COVERAGE.md'));
    assert.ok(calls[0].endsWith(path.join(ROOT, 'scripts/kb/method-coverage.js')));
    const none = shared.regenerateBranchDocs(path.join(ROOT, 'no-such-tree'), { execFileSync: fake });
    assert.deepStrictEqual(none, { ran: [], changed: [] });
  });

  it('docs are additive-only: never drop a target line when taking Bastien bytes', () => {
    const { isAdditiveDoc } = promote;
    assert.strictEqual(isAdditiveDoc('# T\n- a\n- b\n', '# T\n- a\n- b\n- c\n'), true);
    assert.strictEqual(isAdditiveDoc('# T\n- a\n- master only\n', '# T\n- a\n- c\n'), false);
    assert.strictEqual(isAdditiveDoc('# T\n\n- a  \n', '# T\n- a\n'), true);
    const src = fs.readFileSync(path.join(ROOT, 'tools/ci/bastien-promote-upstream.js'), 'utf8');
    assert.match(src, /docs_not_additive_target_ahead/);
  });

  it('every cross-branch sync script uses the shared guard', () => {
    for (const f of ['tools/ci/bastien-promote-upstream.js', 'tools/ci/apply-safe-sync.js']) {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      assert.match(src, /require\('\.\/branch-specific-paths'\)/, f);
      assert.match(src, /isBranchSpecific\(/, f);
    }
  });
});
