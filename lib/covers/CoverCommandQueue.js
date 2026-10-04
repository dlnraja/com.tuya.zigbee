'use strict';

/**
 * CoverCommandQueue: bounded, per-app throttle for cover commands sent from flows.
 *
 * WHY(P2801): one flow ("close all shutters") can drive 10–30 covers in the same
 * tick. Firing every Zigbee/Tuya command at once floods the mesh, and some of them
 * get lost (the cover does not move, yet the flow reports success). Somfy TaHoma
 * paces grouped commands for the same reason. The idea comes from the Overkiz
 * execution queue (iMicknl/pyoverkiz, HA overkiz integration, see CREDITS). This
 * is a fresh implementation, no code copied.
 *
 * Guarantees:
 * - at most `concurrency` commands in flight and `gapMs` between starts;
 * - bounded memory: past `maxPending` queued jobs, the next one runs
 *   immediately instead of failing, so it is never worse than before;
 * - a hung command frees its slot after `jobTimeoutMs`. Its own promise still
 *   settles normally and is never turned into an error.
 */

const DEFAULTS = Object.freeze({ concurrency: 2, gapMs: 200, maxPending: 40, jobTimeoutMs: 15000 });

class CoverCommandQueue {
  constructor(opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    this.concurrency = Math.max(1, o.concurrency | 0);
    this.gapMs = Math.max(0, o.gapMs | 0);
    this.maxPending = Math.max(1, o.maxPending | 0);
    this.jobTimeoutMs = Math.max(100, o.jobTimeoutMs | 0);
    this._timers = o.timers || { setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (t) => clearTimeout(t) };
    this._now = o.now || (() => Date.now());
    this._pending = [];
    this._running = 0;
    this._lastStart = 0;
    this._wakeTimer = null;
    this.stats = { queued: 0, bypassed: 0, timedOut: 0 };
  }

  get size() { return this._pending.length; }
  get running() { return this._running; }

  /** Schedule fn (sync or async). Resolves/rejects with fn's own outcome. */
  run(fn) {
    if (typeof fn !== 'function') {return Promise.reject(new TypeError('fn must be a function'));}
    if (this._pending.length >= this.maxPending) {
      this.stats.bypassed++;
      return Promise.resolve().then(fn);
    }
    this.stats.queued++;
    return new Promise((resolve, reject) => {
      this._pending.push({ fn, resolve, reject });
      this._pump();
    });
  }

  _pump() {
    if (this._wakeTimer) {return;}
    while (this._running < this.concurrency && this._pending.length) {
      const wait = this._lastStart + this.gapMs - this._now();
      if (wait > 0 && this._lastStart) {
        this._wakeTimer = this._timers.setTimeout(() => { this._wakeTimer = null; this._pump(); }, wait);
        return;
      }
      this._start(this._pending.shift());
    }
  }

  _start(job) {
    this._running++;
    this._lastStart = this._now();
    let released = false;
    const release = () => {
      if (released) {return;}
      released = true;
      this._running--;
      this._pump();
    };
    const guard = this._timers.setTimeout(() => { this.stats.timedOut++; release(); }, this.jobTimeoutMs);
    Promise.resolve().then(job.fn).then(
      (v) => { this._timers.clearTimeout(guard); release(); job.resolve(v); },
      (e) => { this._timers.clearTimeout(guard); release(); job.reject(e); }
    );
  }

  /** Drop queued (not running) jobs, e.g. on app unload. They resolve to false. */
  clear() {
    if (this._wakeTimer) { this._timers.clearTimeout(this._wakeTimer); this._wakeTimer = null; }
    const dropped = this._pending.splice(0);
    for (const j of dropped) {j.resolve(false);}
    return dropped.length;
  }
}

const _perApp = new WeakMap();

/** One queue per Homey app instance, using the app's own timers when available. */
function getCoverQueue(homey, opts) {
  if (!homey || typeof homey !== 'object') {return new CoverCommandQueue(opts);}
  let q = _perApp.get(homey);
  if (!q) {
    const timers = typeof homey.setTimeout === 'function'
      ? { setTimeout: (fn, ms) => homey.setTimeout(fn, ms), clearTimeout: (t) => homey.clearTimeout(t) }
      : undefined;
    q = new CoverCommandQueue({ ...opts, timers });
    _perApp.set(homey, q);
  }
  return q;
}

module.exports = { CoverCommandQueue, getCoverQueue, DEFAULTS };
