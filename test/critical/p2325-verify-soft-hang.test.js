'use strict';

const assert = require('assert');
const { describe, it } = require('node:test');
const { softAlertDecision, isTransientAthomFailure } = require('../../scripts/lib/soft-expect-decision');

describe('P2325 verify soft-continue on Athom hang', () => {
  it('soft-skips when hang + healthy Test (Auto-Publish verify path)', () => {
    const d = softAlertDecision(
      [
        { id: 3036, version: '9.0.720', state: 'processing_failed', stateMeta: 'socket hang up' },
        { id: 3020, version: '9.0.710', state: 'test' },
      ],
      { soft: true },
    );
    assert.strictEqual(d.alert, false);
    assert.strictEqual(d.reason, 'transient-hang-healthy-test');
  });

  it('detects Timeout after as transient', () => {
    assert.ok(isTransientAthomFailure({ stateMeta: 'Timeout after 10000ms' }));
  });
});
