'use strict';

/**
 * HeapSentinel (P2830) — low-cost watchdog for the ~64 MB Homey app budget.
 *
 * WHY (Bastien diags 17/10 + 18/10, v1.0.161): the app died repeatedly with
 * "FATAL ERROR: Reached heap limit … JavaScript heap out of memory" (live heap 62-63 MB, SIGABRT).
 * Nothing watched the heap between boot and the crash, and the existing MemwarnGuard only reacts to
 * Homey's own `memwarn` (which may arrive too late). The sentinel samples process.memoryUsage()
 * every 30 s and, when the heap crosses a soft threshold, runs the registered cache cleaners
 * (rebuildable data only) and records a one-line summary so the next diagnostic report shows the
 * heap curve instead of only the final crash. It never throws and never keeps the process alive.
 *
 * Additive: only trims caches that are recomputed on demand. No capability or couple is touched.
 */

const MB = 1024 * 1024;
const DEFAULTS = {
  intervalMs: 30 * 1000,
  warnHeapBytes: 44 * MB,
  criticalHeapBytes: 52 * MB,
  warnRssBytes: 55 * MB,
  criticalRssBytes: 60 * MB,
  cleanCooldownMs: 60 * 1000,
  ringSize: 20,
};

function readMem() {
  try { return process.memoryUsage() || {}; } catch (_e) { return {}; }
}

function levelFor(mem, cfg) {
  const heap = Number(mem.heapUsed) || 0;
  const rss = Number(mem.rss) || 0;
  if (heap >= cfg.criticalHeapBytes || rss >= cfg.criticalRssBytes) { return 'critical'; }
  if (heap >= cfg.warnHeapBytes || rss >= cfg.warnRssBytes) { return 'warn'; }
  return 'ok';
}

class HeapSentinel {
  /**
   * @param {object} o
   * @param {object} [o.guard] MemwarnGuard (handle() runs the cleaners)
   * @param {function} [o.log]
   * @param {function} [o.now]
   * @param {function} [o.readMemory] test seam
   * @param {object} [o.config]
   */
  constructor({ guard = null, log = () => {}, now = () => Date.now(), readMemory = readMem, config = {} } = {}) {
    this.cfg = { ...DEFAULTS, ...config };
    this.guard = guard; this._log = log; this._now = now; this._read = readMemory;
    this.level = 'ok'; this.ring = []; this._lastClean = -Infinity; this._lastLine = -Infinity; this._timer = null;
    this.cleanups = 0;
  }

  /** One sample (public for tests). Returns { level, heapMB, rssMB, cleaned }. */
  tick() {
    let mem = {}; try { mem = this._read() || {}; } catch (_e) { /* soft */ }
    const level = levelFor(mem, this.cfg);
    const heapMB = Math.round((Number(mem.heapUsed) || 0) / MB);
    const rssMB = Math.round((Number(mem.rss) || 0) / MB);
    this.ring.push({ t: this._now(), heapMB, rssMB });
    if (this.ring.length > this.cfg.ringSize) { this.ring.shift(); }
    const changed = level !== this.level;
    this.level = level;
    try { global.__tuyaHeapPressure = level; } catch (_e) { /* soft */ }
    let cleaned = false;
    if (level !== 'ok' && this._now() - this._lastClean >= this.cfg.cleanCooldownMs) {
      this._lastClean = this._now();
      cleaned = true;
      this.cleanups += 1;
      try { this.guard && typeof this.guard.handle === 'function' && this.guard.handle({ count: 0, limit: 0, source: 'heap-sentinel' }); } catch (_e) { /* soft */ }
    }
    if (changed || (level !== 'ok' && cleaned) || this._now() - this._lastLine >= 5 * 60 * 1000) {
      this._lastLine = this._now();
      try {
        const trend = this.ring.slice(-6).map((s) => s.heapMB).join('>');
        this._log(`[HEAP-SENTINEL] level=${level} heap=${heapMB}MB rss=${rssMB}MB trend=${trend}${cleaned ? ' cleaned=1' : ''}`);
      } catch (_e) { /* soft */ }
    }
    return { level, heapMB, rssMB, cleaned };
  }

  start(homey) {
    if (this._timer) { return this; }
    const setI = homey && typeof homey.setInterval === 'function' ? homey.setInterval.bind(homey) : setInterval;
    this._timer = setI(() => { try { this.tick(); } catch (_e) { /* never throw */ } }, this.cfg.intervalMs);
    try { if (this._timer && typeof this._timer.unref === 'function') { this._timer.unref(); } } catch (_e) { /* soft */ }
    return this;
  }

  stop(homey) {
    if (!this._timer) { return; }
    try { (homey && typeof homey.clearInterval === 'function' ? homey.clearInterval(this._timer) : clearInterval(this._timer)); } catch (_e) { /* soft */ }
    this._timer = null;
  }
}

module.exports = { HeapSentinel, levelFor, DEFAULTS };
