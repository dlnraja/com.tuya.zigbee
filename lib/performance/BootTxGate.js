'use strict';

/**
 * BootTxGate (P3389) - bounded concurrency for configureAttributeReporting during app start.
 *
 * WHY: after a Homey restart every paired device runs onNodeInit at the same time and most of
 * them call configureAttributeReporting (2 tries per cluster, each a radio round trip plus a
 * store write). With 10+ devices that is a burst of parallel promises, retries and log lines in
 * the same seconds the app is also parsing its manifest (Bastien OOM / CPU-limit restarts,
 * p3272). HOW: during the first `windowMs` of process uptime at most `concurrency` calls run at
 * once, in arrival order; a queued call never waits longer than `maxWaitMs` (it then starts
 * anyway) and a call still running after `slotHoldMs` (sleepy or unreachable node, retries) gives
 * its slot to the next one while it finishes, so one slow device never holds the others back.
 * Device init is delayed by seconds at worst and nothing is ever dropped. After the window the
 * original method runs directly, unchanged.
 */

const DEFAULTS = Object.freeze({ concurrency: 2, windowMs: 180 * 1000, maxWaitMs: 20 * 1000, slotHoldMs: 3000 });
const MARK = Symbol.for('tuya.p3389.bootTxGate');

class BootTxGate {
  constructor(opts = {}) {
    const o = Object.assign({}, DEFAULTS, opts);
    this.concurrency = Math.max(1, Number(o.concurrency) || 1);
    this.windowMs = Math.max(0, Number(o.windowMs) || 0);
    this.maxWaitMs = Math.max(0, Number(o.maxWaitMs) || 0);
    this.slotHoldMs = Math.max(0, Number(o.slotHoldMs) || 0);
    this._uptimeMs = typeof o.uptimeMs === 'function' ? o.uptimeMs : () => process.uptime() * 1000;
    this._setTimer = o.setTimer || setTimeout;
    this._clearTimer = o.clearTimer || clearTimeout;
    this._active = 0;
    this._queue = [];
    this.stats = { gated: 0, direct: 0, peak: 0, forcedByWait: 0, releasedSlow: 0, maxQueue: 0 };
  }

  inWindow() {
    try { return this._uptimeMs() < this.windowMs; } catch (_e) { return false; }
  }

  run(fn) {
    if (!this.inWindow()) {
      this.stats.direct++;
      return Promise.resolve().then(fn);
    }
    this.stats.gated++;
    return new Promise((resolve, reject) => {
      const job = { fn, resolve, reject, started: false, timer: null };
      if (this._active < this.concurrency) {
        this._start(job);
        return;
      }
      this._queue.push(job);
      if (this._queue.length > this.stats.maxQueue) { this.stats.maxQueue = this._queue.length; }
      if (this.maxWaitMs > 0) {
        job.timer = this._setTimer(() => {
          job.timer = null;
          if (job.started) { return; }
          const i = this._queue.indexOf(job);
          if (i >= 0) { this._queue.splice(i, 1); }
          this.stats.forcedByWait++;
          this._start(job);
        }, this.maxWaitMs);
        if (job.timer && typeof job.timer.unref === 'function') { job.timer.unref(); }
      }
    });
  }

  _start(job) {
    job.started = true;
    if (job.timer) { this._clearTimer(job.timer); job.timer = null; }
    this._active++;
    if (this._active > this.stats.peak) { this.stats.peak = this._active; }
    let released = false;
    const release = () => { if (released) { return; } released = true; this._done(); };
    let hold = null;
    if (this.slotHoldMs > 0) {
      hold = this._setTimer(() => { hold = null; if (!released) { this.stats.releasedSlow++; release(); } }, this.slotHoldMs);
      if (hold && typeof hold.unref === 'function') { hold.unref(); }
    }
    const finish = () => { if (hold) { this._clearTimer(hold); hold = null; } release(); };
    let p;
    try { p = Promise.resolve(job.fn()); } catch (e) { p = Promise.reject(e); }
    p.then(job.resolve, job.reject).then(finish, finish);
  }

  _done() {
    this._active = Math.max(0, this._active - 1);
    while (this._active < this.concurrency && this._queue.length) {
      const next = this._queue.shift();
      if (!next.started) { this._start(next); }
    }
  }
}

let shared = null;
function sharedGate() {
  if (!shared) { shared = new BootTxGate(); }
  return shared;
}

/** Wrap DeviceClass.prototype.configureAttributeReporting once (homey-zigbeedriver ZigBeeDevice). */
function installOn(DeviceClass, gate = sharedGate()) {
  const proto = DeviceClass && DeviceClass.prototype;
  if (!proto || typeof proto.configureAttributeReporting !== 'function') { return false; }
  if (proto.configureAttributeReporting[MARK]) { return true; }
  const original = proto.configureAttributeReporting;
  const gated = function configureAttributeReporting(...args) {
    return gate.run(() => original.apply(this, args));
  };
  gated[MARK] = { original, gate };
  proto.configureAttributeReporting = gated;
  return true;
}

module.exports = { BootTxGate, installOn, sharedGate, DEFAULTS, MARK };
