'use strict';

/**
 * P2831 — Contre quoi: Homey tip emails #3581–#3584 socket hang up flood.
 * Refuse hang republish / createBuild when Test is healthy (P139 tip spam).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  softExpectDecision,
  softAlertDecision,
  hangStormDecision,
  isTransientAthomFailure,
} = require('../../scripts/lib/soft-expect-decision');
const { decide } = require('../../.github/scripts/transient-publish-retry');

const ROOT = path.join(__dirname, '..', '..');

describe('P2831 socket hang tip-mail storm', () => {
  const stormBuilds = [
    { id: 3584, version: '9.0.1480', state: 'processing_failed', stateMeta: 'socket hang up' },
    { id: 3583, version: '9.0.1479', state: 'processing_failed', failureDetail: 'socket hang up' },
    { id: 3582, version: '9.0.1478', state: 'processing_failed', stateMeta: 'AggregateError' },
    { id: 3581, version: '9.0.1477', state: 'processing_failed', stateMeta: 'socket hang up' },
    { id: 3570, version: '9.0.1470', state: 'test' },
  ];

  it('classifies hang + AggregateError as Athom transient', () => {
    assert.equal(isTransientAthomFailure(stormBuilds[0]), true);
    assert.equal(isTransientAthomFailure(stormBuilds[2]), true);
  });

  it('detects hang storm when ≥2 consecutive PF before healthy Test', () => {
    const d = hangStormDecision(stormBuilds);
    assert.equal(d.storm, true);
    assert.ok(d.hangCount >= 2);
    assert.equal(String(d.healthy.id), '3570');
  });

  it('soft-expect skips createBuild during hang storm (unless force)', () => {
    const skip = softExpectDecision(stormBuilds, '9.0.1484');
    assert.equal(skip.skip, true);
    assert.equal(skip.reason, 'hang-storm-healthy-test');
    const forced = softExpectDecision(stormBuilds, '9.0.1484', { force: true });
    assert.equal(forced.skip, false);
  });

  it('transient-retry refuses socket hang when healthy Test exists (legacy mode, P2830e default retries)', () => {
    const d = decide({
      version: '9.0.1480',
      builds: stormBuilds,
      reachTest: false,
    });
    assert.equal(d.retry, false);
    assert.match(String(d.reason), /P2831|healthy Test|tip mail/i);
  });

  it('transient-retry still allows one hang retry when no Test yet', () => {
    const d = decide({
      version: '9.0.1',
      builds: [{ version: '9.0.1', state: 'processing_failed', stateMeta: 'socket hang up' }],
    });
    assert.equal(d.retry, true);
  });

  it('publish-ssot documents P2831 hang-storm', () => {
    const ssot = require('../../config/architecture/publish-ssot.json');
    assert.ok(ssot.p2831);
    assert.equal(ssot.p2831.hangStormSkip, true);
    assert.ok(ssot.p139.tipEmailExamples.includes('#3584'));
  });

  it('soft-alert stays quiet during hang storm when Test healthy', () => {
    const d = softAlertDecision(stormBuilds, { soft: true });
    assert.equal(d.alert, false);
    assert.equal(d.reason, 'transient-hang-healthy-test');
  });

  it('single hang (no storm) does not soft-expect-skip a new tip version', () => {
    const builds = [
      { id: 3584, version: '9.0.1480', state: 'processing_failed', stateMeta: 'socket hang up' },
      { id: 3570, version: '9.0.1470', state: 'test' },
    ];
    assert.equal(hangStormDecision(builds).storm, false);
    const d = softExpectDecision(builds, '9.0.1486');
    assert.equal(d.skip, false);
  });

  it('npm check:p2831 and check:p283x wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2831']?.includes('p2831-socket-hang'));
    assert.ok(pkg.scripts['check:p283x']?.includes('check:p2831'));
  });
});
