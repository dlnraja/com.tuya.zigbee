'use strict';

/**
 * P2458 — Homey tip email builds #3140 / #3142: processing_failed + socket hang up.
 * WHY: tip mail is P139 Athom flake — refuse bump-loop; soft-alert when Test healthy.
 */

const assert = require('assert');
const { describe, it } = require('node:test');
const {
  softAlertDecision,
  softExpectDecision,
  isTransientAthomFailure,
} = require('../../scripts/lib/soft-expect-decision');
const {
  decidePublishRecovery,
} = require('../../.github/scripts/processing-failure-republish-check.js');

describe('P2458 — tip email socket hang up (#3140 / #3142)', () => {
  const now = Date.parse('2026-09-10T20:44:00.000Z');
  const fresh = '2026-09-10T20:40:00.000Z';

  it('treats tip-email socket hang up as transient Athom failure', () => {
    assert.strictEqual(
      isTransientAthomFailure({
        id: 3142,
        version: '9.0.870',
        state: 'processing_failed',
        stateMeta: 'socket hang up',
      }),
      true
    );
    assert.strictEqual(
      isTransientAthomFailure({
        id: 3140,
        version: '9.0.868',
        state: 'processing_failed',
        failureDetail: 'Unfortunately, your build has failed processing. socket hang up',
      }),
      true
    );
  });

  it('soft-skips alert when consecutive hangs exist but Test is healthy', () => {
    const d = softAlertDecision(
      [
        { id: 3142, version: '9.0.870', state: 'processing_failed', stateMeta: 'socket hang up' },
        { id: 3140, version: '9.0.868', state: 'processing_failed', failureDetail: 'socket hang up' },
        { id: 3124, version: '9.0.829', state: 'test' },
      ],
      { soft: true }
    );
    assert.strictEqual(d.alert, false);
    assert.strictEqual(d.reason, 'transient-hang-healthy-test');
    assert.strictEqual(String(d.healthy.id), '3124');
  });

  it('republish-check refuses bump-loop for #3142 hang with healthy Test', () => {
    const decision = decidePublishRecovery({
      appVersion: '9.0.870',
      now,
      report: {
        timestamp: fresh,
        latestBuild: {
          id: 3142,
          version: '9.0.870',
          state: 'processing_failed',
          stateMeta: 'socket hang up',
          failureDetail: 'socket hang up',
        },
        latestBuilds: [
          {
            id: 3142,
            version: '9.0.870',
            state: 'processing_failed',
            failureDetail: 'socket hang up',
          },
          {
            id: 3140,
            version: '9.0.868',
            state: 'processing_failed',
            failureDetail: 'socket hang up',
          },
          { id: 3124, version: '9.0.829', state: 'test' },
        ],
      },
    });
    assert.strictEqual(decision.triggerPublish, false);
    assert.strictEqual(decision.requiresBump, false);
    assert.strictEqual(decision.transient, true);
    assert.match(String(decision.reason), /refuse|healthy|not fixable|soft-alert|P139|P2325/i);
  });

  it('soft-expect does not skip createBuild for a brand-new tip version without peer test', () => {
    // New tip still may upload once; hang recovery is separate (no bump-loop).
    const d = softExpectDecision(
      [
        { id: 3142, version: '9.0.870', state: 'processing_failed', stateMeta: 'socket hang up' },
        { id: 3124, version: '9.0.829', state: 'test' },
      ],
      '9.0.871'
    );
    assert.strictEqual(d.skip, false);
  });

  it('publish-ssot documents tip email builds #3140/#3142', () => {
    const ssot = require('../../config/architecture/publish-ssot.json');
    assert.ok(ssot.p139);
    assert.ok(Array.isArray(ssot.p139.tipEmailExamples));
    assert.ok(ssot.p139.tipEmailExamples.includes('#3140'));
    assert.ok(ssot.p139.tipEmailExamples.includes('#3142'));
    assert.strictEqual(ssot.p139.patch, 'P2458');
  });
});
