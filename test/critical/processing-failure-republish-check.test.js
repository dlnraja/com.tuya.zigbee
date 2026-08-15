'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  decidePublishRecovery,
} = require('../../.github/scripts/processing-failure-republish-check.js');

describe('processing-failure-republish-check (P139)', () => {
  const now = Date.parse('2026-08-15T21:00:00.000Z');
  const fresh = '2026-08-15T20:50:00.000Z';

  it('refuses bump/republish when latest is socket hang up but Test is healthy', () => {
    const decision = decidePublishRecovery({
      appVersion: '9.0.526',
      now,
      report: {
        timestamp: fresh,
        latestBuild: {
          id: 2841,
          version: '9.0.526',
          state: 'processing_failed',
          stateMeta: 'socket hang up',
          failureDetail: 'socket hang up',
        },
        latestBuilds: [
          {
            id: 2841,
            version: '9.0.526',
            state: 'processing_failed',
            failureDetail: 'socket hang up',
          },
          {
            id: 2839,
            version: '9.0.524',
            state: 'test',
          },
        ],
      },
    });

    assert.equal(decision.triggerPublish, false);
    assert.equal(decision.requiresBump, false);
    assert.equal(decision.transient, true);
    assert.match(decision.reason, /Refusing republish loop|healthy v9\.0\.524/i);
  });

  it('refuses transient recovery even without a healthy Test signal', () => {
    const decision = decidePublishRecovery({
      appVersion: '9.0.525',
      now,
      report: {
        timestamp: fresh,
        latestBuild: {
          id: 2840,
          version: '9.0.525',
          state: 'processing_failed',
          failureDetail: 'socket hang up',
        },
        latestBuilds: [
          {
            id: 2840,
            version: '9.0.525',
            state: 'processing_failed',
            failureDetail: 'socket hang up',
          },
        ],
      },
    });

    assert.equal(decision.triggerPublish, false);
    assert.equal(decision.requiresBump, false);
    assert.equal(decision.transient, true);
    assert.match(decision.reason, /not fixable by patch bump/i);
  });

  it('still allows non-transient recovery for the current version', () => {
    const decision = decidePublishRecovery({
      appVersion: '9.0.530',
      now,
      report: {
        timestamp: fresh,
        latestBuild: {
          id: 2900,
          version: '9.0.530',
          state: 'processing_failed',
          failureDetail: 'manifest schema invalid: energy.approximation',
        },
        latestBuilds: [
          {
            id: 2900,
            version: '9.0.530',
            state: 'processing_failed',
            failureDetail: 'manifest schema invalid: energy.approximation',
          },
        ],
      },
    });

    assert.equal(decision.triggerPublish, true);
    assert.equal(decision.requiresBump, true);
    assert.equal(decision.transient, false);
  });
});
