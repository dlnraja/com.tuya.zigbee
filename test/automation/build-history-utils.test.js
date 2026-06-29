'use strict';

const assert = require('assert');
const { summarizeVersionHistory } = require('../../scripts/automation/build-history-utils');
const { classify, extractVersion } = require('../../scripts/automation/version-intelligence-report');

describe('build history utilities', () => {
  it('keeps historical AggregateError failures separate from the latest healthy test build', () => {
    const report = summarizeVersionHistory([
      { id: 2515, version: '9.0.146', state: 'test', sdk: 3, stateChangedAt: '2026-06-29T10:37:04.554Z' },
      { id: 2514, version: '9.0.146', state: 'processing_failed', stateMeta: 'AggregateError', stateChangedAt: '2026-06-29T08:44:42.186Z' },
      { id: 2513, version: '9.0.146', state: 'processing_failed', stateMeta: 'AggregateError', stateChangedAt: '2026-06-29T08:07:43.304Z' },
      { id: 2512, version: '9.0.146', state: 'processing_failed', stateMeta: 'AggregateError', stateChangedAt: '2026-06-29T07:48:25.290Z' },
      { id: 2511, version: '9.0.144', state: 'test', sdk: 3, stateChangedAt: '2026-06-28T21:53:10.120Z' },
    ], { appId: 'com.dlnraja.tuya.zigbee' });

    assert.strictEqual(report.latestWorkingVersion.version, '9.0.146');
    assert.strictEqual(report.latestWorkingVersion.latestState, 'test');
    assert.strictEqual(report.latestTestVersion.version, '9.0.146');
    assert.strictEqual(report.failedOnlyVersions.length, 0);

    const current = report.versionHistory.find(item => item.version === '9.0.146');
    assert(current, 'v9.0.146 should be present in version history');
    assert.strictEqual(current.totalBuilds, 4);
    assert.strictEqual(current.successfulBuilds, 1);
    assert.strictEqual(current.failedBuilds, 3);
    assert.strictEqual(current.failureDetails[0].detail, 'AggregateError');
    assert.strictEqual(current.failureDetails[0].count, 3);
  });

  it('marks versions with only failed builds as failed-only', () => {
    const report = summarizeVersionHistory([
      { id: 12, version: '5.11.219', state: 'test', stateChangedAt: '2026-06-29T09:00:00.000Z' },
      { id: 11, version: '5.11.218', state: 'processing_failed', stateMeta: 'Please reduce your request rate', stateChangedAt: '2026-06-29T08:00:00.000Z' },
    ], { appId: 'com.dlnraja.tuya.zigbee.stable' });

    assert.strictEqual(report.latestWorkingVersion.version, '5.11.219');
    assert.strictEqual(report.latestTestVersion.version, '5.11.219');
    assert.deepStrictEqual(report.failedOnlyVersions.map(item => item.version), ['5.11.218']);
    assert.strictEqual(report.failurePatterns[0].detail, 'Please reduce your request rate');
  });

  it('extracts version and regression themes from commit subjects', () => {
    const subject = 'fix(v5.11.219): monitor Athom AggregateError publish processing and button flows';

    assert.strictEqual(extractVersion(subject), '5.11.219');
    assert(classify(subject).includes('publish_processing'));
    assert(classify(subject).includes('buttons_flows'));
  });
});
