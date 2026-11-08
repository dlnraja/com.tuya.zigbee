'use strict';
// P3048: master upload policy in code. Was 120 min after any of the 3 apps (2026-11-08: 15 min).
// The automation never triggers an upload; this only holds an upload that another path would start.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const P = require(path.join(__dirname, '..', '..', '.github', 'scripts', 'athom-publish-policy.js'));
const MASTER = 'com.dlnraja.tuya.zigbee';
const STABLE = 'com.dlnraja.tuya.zigbee.stable';
const BASTIEN = 'com.dlnraja.tuya.zigbee.bastien';
const NOW = Date.parse('2026-10-25T16:00:00+01:00');
const b = (id, state, minAgo, version = '1.0.0') => ({ id, state, version, at: new Date(NOW - minAgo * 60000).toISOString() });
const own = [b(10, 'test', 30 * 60)]; // master: last own upload 30 h ago

test('cross-app: master held at 14 min, free at the 15 min boundary (was 120)', () => {
  const held = P.slotDecision({ appId: MASTER, builds: own, eventName: 'push', now: NOW, env: {}, otherBuilds: { [STABLE]: [b(7, 'test', 14)] } });
  assert.strictEqual(held.go, false);
  assert.strictEqual(held.deferred, true);
  assert.match(held.reason, /< 15 min across apps/);
  const edge = P.slotDecision({ appId: MASTER, builds: own, eventName: 'push', now: NOW, env: {}, otherBuilds: { [BASTIEN]: [b(7, 'test', 15)] } });
  assert.strictEqual(edge.go, true);
  const oldWindow = P.slotDecision({ appId: MASTER, builds: own, eventName: 'push', now: NOW, env: {}, otherBuilds: { [STABLE]: [b(7, 'test', 30)] } });
  assert.strictEqual(oldWindow.go, true);
});
test('cross-app: stable and bastien keep their own policy (no cross-app rule)', () => {
  const d = P.slotDecision({ appId: STABLE, builds: [b(3, 'test', 30 * 60)], eventName: 'push', now: NOW, env: {}, otherBuilds: { [MASTER]: [b(9, 'test', 1)] } });
  assert.strictEqual(d.go, true);
  const bastien = P.slotDecision({ appId: BASTIEN, builds: [b(3, 'test', 30 * 60)], eventName: 'push', now: NOW, env: {}, otherBuilds: { [MASTER]: [b(9, 'test', 1)], [STABLE]: [b(8, 'test', 1)] } });
  assert.strictEqual(bastien.go, true);
  assert.strictEqual(P.appPolicy(MASTER, {}).crossAppMinIntervalMin, 15);
  assert.ok(!P.appPolicy(STABLE, {}).crossAppMinIntervalMin);
  assert.ok(!P.appPolicy(BASTIEN, {}).crossAppMinIntervalMin);
});
test('cross-app: env override and events list', () => {
  assert.strictEqual(P.appPolicy(MASTER, { ATHOM_CROSS_APP_MIN_INTERVAL_MIN: '0' }).crossAppMinIntervalMin, 0);
  const ev = P.crossAppEvents({ appId: MASTER, outcomes: [], otherBuilds: { [STABLE]: [b(7, 'test', 30)], [BASTIEN]: [b(8, 'test', 10)] } });
  assert.deepStrictEqual(ev.map((e) => e.app), [BASTIEN, STABLE]);
});
test('a manual force_publish dispatch is still the only override', () => {
  const d = P.slotDecision({ appId: MASTER, builds: own, eventName: 'workflow_dispatch', force: 'true', now: NOW, env: {}, otherBuilds: { [STABLE]: [b(7, 'test', 5)] } });
  assert.strictEqual(d.go, true);
});
