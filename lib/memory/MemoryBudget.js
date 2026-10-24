'use strict';

/**
 * P3023: global memory budget monitor (one per app).
 *
 * WHY: the app runs in a small heap (Homey ≈70-100 MB per app, Homey kills it on overrun and
 * emits `memwarn` shortly before). Each layer already has hard caps; this adds a *graded*
 * response so the soft/optional layers give memory back before Homey has to act:
 *
 *   level      heapUsed ≥   action (cumulative)
 *   ok         —            nothing
 *   elevated   45 MB        prune expired TTL entries, release the DP catalogue cache (cheap, lazy reload)
 *   high       60 MB        trim per-device soft maps / background TX queue, re-probes ×2 slower
 *   critical   75 MB        + pause heuristic layers (unknown-command guesses, anomaly learning),
 *                             re-probes ×4 slower
 *
 * NEVER touches core control (capability listeners, DP/ZCL send paths) and NEVER removes a
 * capability: only optional, rebuildable state is shed. A `memwarn` from Homey forces
 * `critical` for 10 minutes. Sampling uses process.memoryUsage() with a v8.getHeapStatistics()
 * fallback, everything in try/catch, one unref'd interval, stop() on app uninit.
 */

const LEVELS = ['ok', 'elevated', 'high', 'critical'];
const DEFAULT_THRESHOLDS_MB = { elevated: 45, high: 60, critical: 75 };
const DEFAULT_INTERVAL_MS = 60 * 1000;
const FORCE_MS = 10 * 60 * 1000;
const REPEAT_HOOK_MS = 5 * 60 * 1000;
const MAX_HOOKS = 32;
const MAX_HISTORY = 12;

function readHeapMB() {
  try {
    const m = process.memoryUsage();
    if (m && Number.isFinite(m.heapUsed)) { return { heapUsed: m.heapUsed / 1048576, rss: Number(m.rss || 0) / 1048576, src: 'process' }; }
  } catch (_e) { /* fallback */ }
  try {
    const s = require('v8').getHeapStatistics();
    return { heapUsed: s.used_heap_size / 1048576, rss: 0, src: 'v8' };
  } catch (_e) { return null; }
}

class MemoryBudget {
  constructor(opts = {}) {
    this.thresholds = Object.assign({}, DEFAULT_THRESHOLDS_MB, opts.thresholdsMB || {});
    this.intervalMs = Number(opts.intervalMs) > 0 ? Number(opts.intervalMs) : DEFAULT_INTERVAL_MS;
    this._read = typeof opts.read === 'function' ? opts.read : readHeapMB;
    this._now = typeof opts.now === 'function' ? opts.now : Date.now;
    this.level = 'ok';
    this.lastSample = null;
    this.history = [];
    this._forcedUntil = 0;
    this._hooks = []; // { name, level, fn, lastAt }
    this._timer = null;
    this._homey = null;
    this._log = null;
    this.stats = { samples: 0, escalations: 0, hookRuns: 0, hookErrors: 0 };
  }

  /** Register a degrade hook run when the level reaches `level` (and again every 5 min while it stays). */
  register(name, level, fn) {
    if (typeof fn !== 'function' || !LEVELS.includes(level) || level === 'ok') { return false; }
    const existing = this._hooks.find((h) => h.name === name);
    if (existing) { Object.assign(existing, { level, fn }); return true; }
    if (this._hooks.length >= MAX_HOOKS) { return false; }
    this._hooks.push({ name: String(name).slice(0, 40), level, fn, lastAt: 0 });
    return true;
  }

  unregister(name) { this._hooks = this._hooks.filter((h) => h.name !== name); }

  _levelFor(mb) {
    if (!Number.isFinite(mb)) { return 'ok'; }
    if (mb >= this.thresholds.critical) { return 'critical'; }
    if (mb >= this.thresholds.high) { return 'high'; }
    if (mb >= this.thresholds.elevated) { return 'elevated'; }
    return 'ok';
  }

  /** Take one sample, update the level, run due hooks. Never throws. */
  sample() {
    try {
      const now = this._now();
      const s = this._read();
      this.stats.samples++;
      let lvl = s ? this._levelFor(s.heapUsed) : 'ok';
      if (now < this._forcedUntil && LEVELS.indexOf(lvl) < LEVELS.indexOf('critical')) { lvl = 'critical'; }
      if (s) {
        this.lastSample = { at: now, heapMB: Math.round(s.heapUsed * 10) / 10, rssMB: Math.round(s.rss * 10) / 10, src: s.src };
        this.history.push([now, this.lastSample.heapMB]);
        if (this.history.length > MAX_HISTORY) { this.history.splice(0, this.history.length - MAX_HISTORY); }
      }
      this._setLevel(lvl, now);
      return this.level;
    } catch (_e) { return this.level; }
  }

  _setLevel(lvl, now) {
    const prev = this.level;
    this.level = lvl;
    const rank = LEVELS.indexOf(lvl);
    if (rank > LEVELS.indexOf(prev)) {
      this.stats.escalations++;
      try { if (this._log) { this._log(`[MEM-BUDGET] ${prev} → ${lvl}${this.lastSample ? ` (heap ${this.lastSample.heapMB} MB)` : ''}`); } } catch (_e) { /* soft */ }
    }
    for (const h of this._hooks) {
      if (LEVELS.indexOf(h.level) > rank) { continue; }
      if (h.lastAt && now - h.lastAt < REPEAT_HOOK_MS && rank <= LEVELS.indexOf(prev)) { continue; }
      h.lastAt = now;
      try { h.fn(lvl); this.stats.hookRuns++; } catch (_e) { this.stats.hookErrors++; }
    }
  }

  /** Homey `memwarn` → act now and stay critical for 10 min. */
  onMemwarn() {
    const now = this._now();
    this._forcedUntil = now + FORCE_MS;
    for (const h of this._hooks) { h.lastAt = 0; }
    return this.sample();
  }

  /** Re-probe slow-down factor for optional background probing (MethodChain, re-reads). */
  reprobeFactor() {
    if (this.level === 'critical') { return 4; }
    if (this.level === 'high') { return 2; }
    return 1;
  }

  /** True when heuristic (non-exact) layers must not learn or fire. Core control is never paused. */
  heuristicsPaused() { return this.level === 'critical'; }

  start(homey, opts = {}) {
    this.stop();
    this._homey = homey || null;
    this._log = typeof opts.log === 'function' ? opts.log : null;
    const tick = () => this.sample();
    try {
      if (homey && typeof homey.setInterval === 'function') {
        this._timer = homey.setInterval(tick, this.intervalMs);
      } else {
        // no homey (tests / scripts): module-level native setInterval, unref'd, cleared in stop()
        this._timer = setInterval(tick, this.intervalMs);
      }
      if (this._timer && typeof this._timer.unref === 'function') { this._timer.unref(); }
    } catch (_e) { this._timer = null; }
    this.sample();
    return this;
  }

  stop() {
    const t = this._timer;
    this._timer = null;
    if (!t) { return; }
    try { if (this._homey && typeof this._homey.clearInterval === 'function') { this._homey.clearInterval(t); } } catch (_e) { /* soft */ }
    try { clearInterval(t); } catch (_e) { /* soft */ }
  }

  snapshot() {
    return {
      level: this.level,
      last: this.lastSample,
      thresholdsMB: Object.assign({}, this.thresholds),
      forced: this._now() < this._forcedUntil,
      hooks: this._hooks.map((h) => `${h.name}@${h.level}`),
      history: this.history.slice(-6),
      stats: Object.assign({}, this.stats),
    };
  }
}

// One instance per app process (Homey runs one app per process).
let _shared = null;
function shared() { if (!_shared) { _shared = new MemoryBudget(); } return _shared; }
/** Tests only. */
function _resetShared() { if (_shared) { _shared.stop(); } _shared = null; }

/** Convenience accessors safe to call from any layer even if the budget never started. */
function reprobeFactor() { try { return _shared ? _shared.reprobeFactor() : 1; } catch (_e) { return 1; } }
function heuristicsPaused() { try { return _shared ? _shared.heuristicsPaused() : false; } catch (_e) { return false; } }

module.exports = { MemoryBudget, shared, reprobeFactor, heuristicsPaused, readHeapMB, LEVELS, DEFAULT_THRESHOLDS_MB, _resetShared };
