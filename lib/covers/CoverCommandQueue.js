'use strict';
const { nativeSetTimeout, nativeClearTimeout } = require('../utils/nativeTimer'); // P3068

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
 *
 * P3030 (optional per call, `run(fn, { key, sig })`), lessons from Adrian
 * Rockall's Somfy TaHoma & Connexoon app (community topic 35206, posts #761,
 * #826, v2.1.69 and v4.0.68 notes, see CREDITS), rewritten for Zigbee:
 * - superseding: a newer command for the same cover (same `key`) that arrives
 *   while the older one is still waiting replaces it in place. Both callers get
 *   the newer command's outcome, so "open" then "close" in a burst only sends
 *   "close";
 * - de-duplication: the same command (`key` + `sig`) that is already queued, or
 *   started less than `dedupMs` ago, shares that run instead of sending twice;
 * - one retry for transient radio errors only (timeouts, no ACK, MAC/NWK
 *   failures). Cover commands are idempotent, so a resend is safe. Errors
 *   that are not transient are never retried.
 * Calls without `key` behave exactly as before (no merge, no retry).
 */

const DEFAULTS = Object.freeze({
  concurrency: 2, gapMs: 200, maxPending: 40, jobTimeoutMs: 15000,
  retries: 1, retryDelayMs: 700, dedupMs: 1500,
});

// Radio-level failures that a resend can fix. Deliberately narrow.
const TRANSIENT_RE = /timed?\s?out|ETIMEDOUT|no response|not respond|reageert niet|unreachable|EHOSTUNREACH|no ack|MAC_|NWK_|APS_|channel access/i;

function isTransientError(err) {
  if (!err) {return false;}
  const text = `${err.code || ''} ${err.message || (typeof err === 'string' ? err : '')}`;
  return TRANSIENT_RE.test(text);
}

// Keyed calls (one cover) get merge + retry; un-keyed calls behave as before P3030.
function runOptions(opts, defaultRetries) {
  const o = opts || {};
  const key = o.key === undefined || o.key === null ? null : String(o.key);
  const sig = key === null || o.sig === undefined || o.sig === null ? null : String(o.sig);
  let retries = key === null ? 0 : defaultRetries;
  if (Number.isFinite(o.retries)) {retries = Math.max(0, Math.min(3, o.retries | 0));}
  return { key, sig, retries };
}

class CoverCommandQueue {
  constructor(opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    this.concurrency = Math.max(1, o.concurrency | 0);
    this.gapMs = Math.max(0, o.gapMs | 0);
    this.maxPending = Math.max(1, o.maxPending | 0);
    this.jobTimeoutMs = Math.max(100, o.jobTimeoutMs | 0);
    this.retries = Math.max(0, Math.min(3, o.retries | 0));
    this.retryDelayMs = Math.max(0, o.retryDelayMs | 0);
    this.dedupMs = Math.max(0, o.dedupMs | 0);
    this._inflight = new Map(); // key -> { sig, startedAt, promise } (bounded by concurrency)
    this._timers = o.timers || { setTimeout: (fn, ms) => nativeSetTimeout(fn, ms), clearTimeout: (t) => nativeClearTimeout(t) };
    this._now = o.now || (() => Date.now());
    this._pending = [];
    this._running = 0;
    this._lastStart = 0;
    this._wakeTimer = null;
    this.stats = { queued: 0, bypassed: 0, timedOut: 0, superseded: 0, deduped: 0, retried: 0 };
  }

  get size() { return this._pending.length; }
  get running() { return this._running; }

  /**
   * Schedule fn (sync or async). Resolves/rejects with fn's own outcome.
   * @param {Function} fn
   * @param {{key?: string, sig?: string, retries?: number}} [opts]
   *   key: one cover (device id); sig: the command (e.g. "open", "pos:40").
   */
  run(fn, opts = {}) {
    if (typeof fn !== 'function') {return Promise.reject(new TypeError('fn must be a function'));}
    const { key, sig, retries } = runOptions(opts, this.retries);
    if (key !== null) {
      const queued = this._pending.find((j) => j.key === key);
      if (queued && sig !== null && queued.sig === sig) { this.stats.deduped++; return queued.promise; }
      const live = sig !== null ? this._inflight.get(key) : null;
      if (live && live.sig === sig && this._now() - live.startedAt < this.dedupMs) {
        this.stats.deduped++;
        return live.promise;
      }
      if (queued) {
        // newer command wins; keeps the older one's place in the queue
        queued.fn = fn; queued.sig = sig; queued.retries = retries;
        this.stats.superseded++;
        return queued.promise;
      }
    }
    if (this._pending.length >= this.maxPending) {
      this.stats.bypassed++;
      return Promise.resolve().then(fn);
    }
    this.stats.queued++;
    const job = { fn, key, sig, retries, resolve: null, reject: null, promise: null };
    job.promise = new Promise((resolve, reject) => { job.resolve = resolve; job.reject = reject; });
    this._pending.push(job);
    this._pump();
    return job.promise;
  }

  _attempt(job, left) {
    return Promise.resolve().then(job.fn).catch((e) => {
      if (left <= 0 || !isTransientError(e)) {throw e;}
      this.stats.retried++;
      return new Promise((r) => this._timers.setTimeout(r, this.retryDelayMs)).then(() => this._attempt(job, left - 1));
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
    const entry = job.key !== null && job.key !== undefined ? { sig: job.sig, startedAt: this._lastStart, promise: job.promise } : null;
    if (entry) {this._inflight.set(job.key, entry);}
    const done = () => {
      this._timers.clearTimeout(guard);
      if (entry && this._inflight.get(job.key) === entry) {this._inflight.delete(job.key);}
      release();
    };
    this._attempt(job, job.retries || 0).then(
      (v) => { done(); job.resolve(v); },
      (e) => { done(); job.reject(e); }
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

/** Stable per-cover key for run({ key }): Homey device data id, else null (no merging). */
function coverKey(device) {
  try {
    const d = device && typeof device.getData === 'function' ? device.getData() : null;
    const id = (d && d.id) || (device && device.id);
    return id === undefined || id === null || id === '' ? null : String(id);
  } catch (_) { return null; }
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

module.exports = { CoverCommandQueue, getCoverQueue, DEFAULTS, isTransientError, coverKey };
