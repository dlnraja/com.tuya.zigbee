'use strict';
// P3068: long-lived runtime caches in lib/ -> BoundedFifoMap / boundedPush (hard ceiling, Map-identical
// below it) and every native timer fallback in lib/ -> lib/utils/nativeTimer (one audited gateway).
// No behaviour change below the ceilings; memory-hazard ratchet counts go down.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const { BoundedFifoMap, BoundedFifoSet, boundedPush } = require('../../lib/memory/BoundedCollections');
const nt = require('../../lib/utils/nativeTimer');
const { scanSource } = require('../../scripts/ci/memory-hazard-ratchet');

const COLLECTIONS = {
  'lib/IntelligentSensorInference.js': ['_history', '_lastValues'],
  'lib/LocalFirstEngine.js': ['_aiBreakers'],
  'lib/autonomous/AutonomousVerificationEngine.js': ['_fixes', '_errorMemory', '_errorRecurrence'],
  'lib/coordinator/DeviceCoordinator.js': ['_rx', '_seq', '_tx'],
  'lib/protocol/HybridProtocolArbitrator.js': ['_events'],
  'lib/multichannel/ReceptionManager.js': ['_lastSeen'],
  'lib/performance/PerformanceOptimizer.js': ['rateLimits'],
  'lib/performance/StartupTimeProfiler.js': ['_phases', '_milestones', '_moduleLoads'],
  'lib/utils/AdaptiveEventEmitter.js': ['_lastEmit', '_cooldowns'],
  'lib/utils/SmartValueProcessor.js': ['valueHistory'],
  'lib/zigbee/ZigbeeProtocolPatchManager.js': ['_throttle'],
  'lib/DiagnosticEngine.js': ['issues'],
};
const TIMERS = ['lib/covers/CoverCommandQueue.js', 'lib/covers/CoverMotionTracker.js', 'lib/memory/MemoryBudget.js',
  'lib/reliability/ZigbeeResilience.js', 'lib/smart/CoupleKnowledge.js', 'lib/tuya-local/TuyaShadowPulsar.js',
  'lib/utils/UniversalThrottleManager.js', 'lib/utils/clusterUtils.js', 'lib/utils/safe-timers.js'];
const scan = (f) => scanSource(fs.readFileSync(path.join(ROOT, f), 'utf8')).hits;

test('P3068 BoundedFifoMap/Set behave like Map/Set below the ceiling and never exceed it', () => {
  const m = new BoundedFifoMap(3); const ref = new Map();
  for (const [k, v] of [['a', 1], ['b', 2], ['a', 9]]) { m.set(k, v); ref.set(k, v); }
  assert.ok(m instanceof Map);
  assert.deepStrictEqual([...m], [...ref]);
  assert.deepStrictEqual(Object.fromEntries(m), Object.fromEntries(ref));
  m.set('c', 3); assert.strictEqual(m.size, 3); assert.strictEqual(m.evictions, 0);
  m.set('c', 4); assert.strictEqual(m.evictions, 0, 'updating an existing key never evicts');
  for (let i = 0; i < 1000; i++) { m.set(`k${i}`, i); }
  assert.strictEqual(m.size, 3); assert.deepStrictEqual([...m.keys()], ['k997', 'k998', 'k999']);
  assert.strictEqual(new BoundedFifoMap(2, [[1, 1], [2, 2], [3, 3]]).has(1), false);
  const s = new BoundedFifoSet(2); s.add(1).add(1).add(2).add(3);
  assert.ok(s instanceof Set); assert.deepStrictEqual([...s], [2, 3]);
  const a = []; for (let i = 0; i < 10; i++) { boundedPush(a, i, 4); }
  assert.deepStrictEqual(a, [6, 7, 8, 9]);
  assert.strictEqual(boundedPush(null, 1), 0);
});

test('P3068 nativeTimer delegates to globalThis at call time (fake timers keep working)', () => {
  const orig = globalThis.setTimeout; const calls = [];
  globalThis.setTimeout = (fn, ms, x) => { calls.push([ms, x]); return 'T'; };
  try { assert.strictEqual(nt.nativeSetTimeout(() => {}, 42, 'x'), 'T'); } finally { globalThis.setTimeout = orig; }
  assert.deepStrictEqual(calls, [[42, 'x']]);
  const t = nt.nativeSetInterval(() => {}, 1000); nt.nativeClearInterval(t);
});

test('P3068 patched lib files: no unbounded runtime collection, no raw native timer outside the gateway', () => {
  for (const [f, names] of Object.entries(COLLECTIONS)) {
    if (!fs.existsSync(path.join(ROOT, f))) { continue; }
    const left = scan(f)['unbounded-collection'].map((h) => h.split(' ')[1]).filter((n) => names.includes(n));
    assert.deepStrictEqual(left, [], `${f} still unbounded: ${left}`);
  }
  for (const f of TIMERS) {
    if (!fs.existsSync(path.join(ROOT, f))) { continue; }
    assert.deepStrictEqual(scan(f)['raw-timer'], [], `${f} raw timer`);
  }
  assert.ok(scan('lib/utils/nativeTimer.js')['raw-timer'].length <= 2);
});

test('P3068 behaviour smoke: coordinator dedupe unchanged below the ceiling', { skip: !fs.existsSync(path.join(ROOT, 'lib/coordinator/DeviceCoordinator.js')) }, () => {
  const { DeviceCoordinator } = require('../../lib/coordinator/DeviceCoordinator');
  let now = 1000;
  const c = new DeviceCoordinator({}, { now: () => now, profile: { dedupeMs: 500, commandMs: 0 } });
  assert.strictEqual(c.ingest('zcl', 'onoff', true).apply, true);
  now += 100; assert.strictEqual(c.ingest('dp', 'onoff', true).apply, false);
  now += 1000; assert.strictEqual(c.ingest('dp', 'onoff', true).apply, true);
  for (let i = 0; i < 2000; i++) { c.ingest('zcl', `k${i}`, i); }
  assert.ok(c._rx.size <= 512);
});
