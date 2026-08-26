'use strict';

/**
 * P2286 — Soft-expect Athom publish race (BOTH)
 * WHY: #2997→#2998 / Stable #23 — skip createBuild/upload when peer already test.
 */

const assert = require('assert');
const { describe, it } = require('node:test');
const { softExpectDecision } = require('../../scripts/lib/soft-expect-decision');

describe('P2286 softExpectDecision', () => {
  it('skips when same version already on test', () => {
    const d = softExpectDecision(
      [{ id: 1, version: '9.0.666', state: 'test' }],
      '9.0.666'
    );
    assert.strictEqual(d.skip, true);
    assert.strictEqual(d.reason, 'already-test');
    assert.strictEqual(d.build.id, 1);
  });

  it('skips when in-flight processing', () => {
    const d = softExpectDecision(
      [{ id: 2, version: '5.12.95', state: 'waiting_for_files' }],
      '5.12.95'
    );
    assert.strictEqual(d.skip, true);
    assert.strictEqual(d.reason, 'in-flight');
  });

  it('skips orphan failed when peer already test', () => {
    const d = softExpectDecision(
      [
        { id: 10, version: '9.0.666', state: 'processing_failed' },
        { id: 11, version: '9.0.666', state: 'test' },
      ],
      '9.0.666',
      { excludeBuildId: 10 }
    );
    assert.strictEqual(d.skip, true);
    assert.ok(d.reason === 'already-test' || d.reason === 'peer-test-after-failed');
    assert.strictEqual(String(d.build.id), '11');
  });

  it('does not skip when force', () => {
    const d = softExpectDecision(
      [{ id: 1, version: '9.0.666', state: 'test' }],
      '9.0.666',
      { force: true }
    );
    assert.strictEqual(d.skip, false);
  });

  it('excludes own buildId from peer match', () => {
    const d = softExpectDecision(
      [{ id: 99, version: '9.0.666', state: 'draft' }],
      '9.0.666',
      { excludeBuildId: 99 }
    );
    assert.strictEqual(d.skip, false);
  });
});
