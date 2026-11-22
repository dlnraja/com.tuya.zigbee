'use strict';
// P3389 (t1023u, lead 5 bounded everything): per-device-id maps in UniversalThrottleManager grew for
// the life of the app (one entry per device id ever seen: deleted / re-paired / phantom ids).
// Fail-before: 1000 ids leave 1000 semaphore entries and 1000 TX trackers after cleanup().
const assert = require('assert');
const path = require('path');

const UTM = path.join(__dirname, '..', 'lib', 'utils', 'UniversalThrottleManager.js');

describe('P3389 bounded per-device trackers', () => {
  it('TX semaphore keeps only in-flight devices, same acquire/release answers', () => {
    const u = require(UTM);
    const base = u.getStats().semaphoreActiveCount;
    for (let i = 0; i < 1000; i++) {
      const id = `p3389-sem-${i}`;
      assert.strictEqual(u.acquireTxSemaphore(id), true);
      assert.strictEqual(u.acquireTxSemaphore(id), true);
      assert.strictEqual(u.acquireTxSemaphore(id), false, 'max 2 per device unchanged');
      assert.strictEqual(u.getTxConcurrency(id), 2);
      u.releaseTxSemaphore(id);
      assert.strictEqual(u.getTxConcurrency(id), 1);
      u.releaseTxSemaphore(id);
      assert.strictEqual(u.getTxConcurrency(id), 0);
    }
    assert.strictEqual(u.getStats().semaphoreActiveCount, base);
  });

  it('cleanup() bounds TX/RX trackers to the soft cap, never drops a device in TX cooldown', () => {
    const u = require(UTM);
    const realNow = Date.now;
    const t0 = realNow();
    try {
      Date.now = () => t0 - 10 * 60 * 1000;
      for (let i = 0; i < 1000; i++) { u.trackTx(`p3389-tx-${i}`, 'mains'); u.trackRx(`p3389-tx-${i}`, 'mains'); }
      // one device rate-limited with a cooldown that is still running
      Date.now = () => t0;
      let r;
      for (let i = 0; i < 1000; i++) { r = u.trackTx('p3389-cooling', 'battery'); if (!r.allowed) { break; } }
      assert.strictEqual(r.allowed, false);
      u.cleanup();
      const s = u.getStats();
      assert.ok(s.txTrackerCount <= 256, `tx trackers ${s.txTrackerCount}`);
      assert.ok(s.rxTrackerCount <= 256, `rx trackers ${s.rxTrackerCount}`);
      assert.strictEqual(u.trackTx('p3389-cooling', 'battery').allowed, false, 'cooldown kept');
    } finally {
      Date.now = realNow;
    }
  });

  it('pruneIdleTrackers leaves small homes untouched', () => {
    const { pruneIdleTrackers } = require(UTM);
    const m = new Map();
    for (let i = 0; i < 40; i++) { m.set(`d${i}`, { windowStart: 0, blocked: false }); }
    assert.strictEqual(pruneIdleTrackers(m, Date.now(), 1000), 0);
    assert.strictEqual(m.size, 40);
  });
});
