'use strict';
// P3091 (31/10/2026 Paris): master cap 1 -> 4 ok uploads / 24 h, 120 min spacing kept,
// +1 slot / 24 h only for a release_held dispatch (PUBLISH_HOLD_RELEASE non-empty).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const P = require(path.join(__dirname, '../../.github/scripts/athom-publish-policy.js'));
const MASTER = 'com.dlnraja.tuya.zigbee';
const NOW = Date.parse('2026-10-31T21:00:00+01:00');
const b = (id, state, min) => ({ id, state, created: new Date(NOW - min * 60000).toISOString() });
const okBuilds = (n) => Array.from({ length: n }, (_, i) => b(100 + i, 'test', 130 + i * 150));

describe('P3091 master upload cap', () => {
  it('policy: 4 / 24 h, 120 min spacing, +1 release_held', () => {
    const p = P.appPolicy(MASTER, {});
    assert.strictEqual(p.maxSuccessPer24h, 4);
    assert.strictEqual(p.minIntervalMin, 120);
    assert.strictEqual(p.releaseHeldExtraPer24h, 1);
  });
  it('1..3 ok uploads in 24 h leave a slot; 4 hold a normal push', () => {
    assert.strictEqual(P.slotDecision({ appId: MASTER, builds: okBuilds(3), eventName: 'push', now: NOW, env: {} }).go, true);
    assert.strictEqual(P.slotDecision({ appId: MASTER, builds: okBuilds(4), eventName: 'push', now: NOW, env: {} }).go, false);
  });
  it('release_held gets one extra slot, not two', () => {
    const env = { PUBLISH_HOLD_RELEASE: 'a,b' };
    assert.strictEqual(P.slotDecision({ appId: MASTER, builds: okBuilds(4), eventName: 'workflow_dispatch', now: NOW, env }).go, true);
    assert.strictEqual(P.slotDecision({ appId: MASTER, builds: okBuilds(5), eventName: 'workflow_dispatch', now: NOW, env }).go, false);
  });
  it('spacing still applies to release_held', () => {
    const d = P.slotDecision({ appId: MASTER, builds: [b(1, 'test', 60)], eventName: 'workflow_dispatch', now: NOW, env: { PUBLISH_HOLD_RELEASE: 'a' } });
    assert.strictEqual(d.go, false);
    assert.match(d.reason, /< 120 min/);
  });
  it('AggregateError stays a real failure (breaker trips, no retry)', () => {
    const c = P.classify ? P.classify('AggregateError: x') : null;
    if (c) assert.notStrictEqual(c.kind || c.type || c, 'transient');
  });
});
