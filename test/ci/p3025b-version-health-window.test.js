'use strict';
// P3025b: the healthy Test tip is searched across ALL builds, not only the 20-build display window.
// Regression for run 39762903102 (2026-10-22 12:24 Paris): #3667-#3676 processing_failed pushed
// Test #3655 (9.0.1574) out of the window and the cron went red although Test was healthy.
const { describe, it } = require('../_support/dual-runner'); // P3020
const assert = require('assert');
const { evaluate, patchOf } = require('../../scripts/ci/version-health-check');

const NOW = Date.parse('2026-10-22T10:24:48Z');
const H = 3600 * 1000;
const ENV = {};

function realWindow() {
  // #3655 Test 9.0.1574 healthy, then #3656..#3676 processing_failed (21 drafts).
  const builds = [{ id: 3655, version: '9.0.1574', state: 'test', crashes: 0, createdAt: new Date(NOW - 80 * H).toISOString() }];
  for (let id = 3656, v = 1575; id <= 3676; id++, v++) {
    builds.push({ id, version: `9.0.${Math.min(v, 1593)}`, state: 'processing_failed', crashes: 0, createdAt: new Date(NOW - (3676 - id + 7) * H).toISOString() });
  }
  return builds;
}

describe('P3025b version-health window', function () {
  it('keeps the healthy Test tip when it falls out of the 20-build window (soft-expect, not red)', () => {
    const r = evaluate(realWindow(), { now: NOW, env: ENV });
    assert.strictEqual(r.recent.length, 20);
    assert.ok(!r.recent.some((b) => b.id === 3655), 'fixture must put the tip outside the window');
    assert.strictEqual(r.newestTesting.id, 3655);
    assert.strictEqual(r.tipHealthy, true);
    assert.strictEqual(r.stuckFailed.length, 0);
    assert.strictEqual(r.bad, false);
    assert.ok(r.lines.some((l) => l.startsWith('⚠️ processing_failed builds')));
    assert.ok(r.lines.some((l) => /healthy Test tip #3655 v9\.0\.1574 \(outside the display window\)/.test(l)));
  });

  it('old behaviour reproduced: with no Test build at all, stale drafts are stuck (red)', () => {
    const builds = realWindow().filter((b) => b.state !== 'test');
    const r = evaluate(builds, { now: NOW, env: ENV });
    assert.strictEqual(r.bad, true);
    assert.ok(r.stuckFailed.length > 0);
  });

  it('turns red when the healthy tip lags the failed drafts by more than VERSION_HEALTH_MAX_TIP_LAG', () => {
    const r = evaluate(realWindow(), { now: NOW, env: { VERSION_HEALTH_MAX_TIP_LAG: '10' } });
    assert.strictEqual(r.bad, true);
    assert.ok(r.lines.some((l) => /healthy tip lags > 10 patches/.test(l)));
  });

  it('a crashed Test tip outside the window is still reported', () => {
    const builds = realWindow();
    builds[0].crashes = 3;
    builds[0].createdAt = new Date(NOW - 2 * 24 * H).toISOString();
    const r = evaluate(builds, { now: NOW, env: ENV });
    assert.strictEqual(r.bad, true);
    assert.ok(r.crashed.some((b) => b.id === 3655));
  });

  it('fresh processing_failed (< fail age) without tip stays soft', () => {
    const builds = [{ id: 10, version: '9.0.10', state: 'processing_failed', createdAt: new Date(NOW - 1 * H).toISOString() }];
    assert.strictEqual(evaluate(builds, { now: NOW, env: ENV }).bad, false);
  });

  it('soft-expect disabled restores the hard fail', () => {
    const r = evaluate(realWindow(), { now: NOW, env: { VERSION_HEALTH_SOFT_EXPECT: '0' } });
    assert.strictEqual(r.bad, true);
  });

  it('patchOf orders versions strictly', () => {
    assert.ok(patchOf('9.0.1595') - patchOf('9.0.1574') === 21);
    assert.ok(patchOf('9.1.0') > patchOf('9.0.9999'));
    assert.ok(Number.isNaN(patchOf('x')));
  });
});
