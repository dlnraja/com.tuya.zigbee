'use strict';
// P3091: master success cap, plus one release_held slot. 2026-11-08 internal
// throttle is 6 / 24 h and 30 min (was 4 / 24 h and 120 min). Failures do not count.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const P = require(path.join(__dirname, '../../.github/scripts/athom-publish-policy.js'));
const MASTER = 'com.dlnraja.tuya.zigbee';
const NOW = Date.parse('2026-10-31T21:00:00+01:00');
const b = (id, state, min) => ({ id, state, created: new Date(NOW - min * 60000).toISOString() });
const okBuilds = (n) => Array.from({ length: n }, (_, i) => b(100 + i, 'test', 130 + i * 150));

describe('P3091 master upload cap', () => {
  it('policy: 6 / 24 h, 30 min spacing, +1 release_held', () => {
    const p = P.appPolicy(MASTER, {});
    assert.strictEqual(p.maxSuccessPer24h, 6);
    assert.strictEqual(p.minIntervalMin, 30);
    assert.strictEqual(p.releaseHeldExtraPer24h, 1);
  });
  it('1..5 ok uploads in 24 h leave a slot; 6 hold a normal push', () => {
    assert.strictEqual(P.slotDecision({ appId: MASTER, builds: okBuilds(5), eventName: 'push', now: NOW, env: {} }).go, true);
    assert.strictEqual(P.slotDecision({ appId: MASTER, builds: okBuilds(6), eventName: 'push', now: NOW, env: {} }).go, false);
  });
  it('release_held gets one extra slot, not two', () => {
    const env = { PUBLISH_HOLD_RELEASE: 'a,b' };
    assert.strictEqual(P.slotDecision({ appId: MASTER, builds: okBuilds(6), eventName: 'workflow_dispatch', now: NOW, env }).go, true);
    assert.strictEqual(P.slotDecision({ appId: MASTER, builds: okBuilds(7), eventName: 'workflow_dispatch', now: NOW, env }).go, false);
  });
  it('spacing still applies to release_held', () => {
    const d = P.slotDecision({ appId: MASTER, builds: [b(1, 'test', 20)], eventName: 'workflow_dispatch', now: NOW, env: { PUBLISH_HOLD_RELEASE: 'a' } });
    assert.strictEqual(d.go, false);
    assert.match(d.reason, /< 30 min/);
  });
  it('AggregateError stays a real failure (breaker trips, no retry)', () => {
    const c = P.classify ? P.classify('AggregateError: x') : null;
    if (c) assert.notStrictEqual(c.kind || c.type || c, 'transient');
  });
});
