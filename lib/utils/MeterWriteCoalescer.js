'use strict';

/**
 * MeterWriteCoalescer (P3298) — per-capability write coalescing for chatty metering devices.
 *
 * WHY: CPU-limit diagnostics (b3f8c2c6, b2e9ffe8, no manufacturerName/productId) showed power_clamp_meter
 * bursts: every Tuya frame is seen by three cluster listeners (response/reporting/datapoint), each DP
 * wrote a capability and logged a line, and identical values were written again and again. Each write is
 * a Homey IPC round-trip.
 * HOW (no value is lost, only intermediate ones in a burst):
 *  - an identical value written again within `refreshMs` is skipped (a refresh still goes out after it);
 *  - distinct values closer than `minIntervalMs` are coalesced: the latest one is written once the interval
 *    has passed (trailing write, one timer per capability);
 *  - `latest(cap)` returns the newest accepted value, so derived totals never read a stale capability.
 * Never throws: a failing write is reported through `onError` (bounded by the caller).
 */
class MeterWriteCoalescer {
  constructor({ minIntervalMs = 2000, refreshMs = 5 * 60 * 1000, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout, onError = null } = {}) {
    this.minIntervalMs = minIntervalMs;
    this.refreshMs = refreshMs;
    this._now = now;
    this._setTimer = setTimer;
    this._clearTimer = clearTimer;
    this._onError = onError;
    this._state = new Map(); // cap -> { value, at, pending, timer, write }
    this.stats = { written: 0, skippedSame: 0, coalesced: 0 };
    this._destroyed = false;
  }

  latest(cap) {
    const st = this._state.get(cap);
    if (!st) { return undefined; }
    return st.pending ? st.pending.value : st.value;
  }

  submit(cap, value, write) {
    if (this._destroyed) { return Promise.resolve(false); }
    const now = this._now();
    let st = this._state.get(cap);
    if (!st) { st = { value: undefined, at: -Infinity, pending: null, timer: null }; this._state.set(cap, st); }
    if (!st.pending && st.value === value && now - st.at < this.refreshMs) {
      this.stats.skippedSame++;
      return Promise.resolve(false);
    }
    if (now - st.at < this.minIntervalMs) {
      if (st.pending) { this.stats.coalesced++; }
      st.pending = { value, write };
      if (!st.timer) {
        const wait = Math.max(0, this.minIntervalMs - (now - st.at));
        st.timer = this._setTimer(() => this._flush(cap), wait);
        if (st.timer && typeof st.timer.unref === 'function') { st.timer.unref(); }
      }
      return Promise.resolve(true);
    }
    return this._write(cap, st, value, write);
  }

  _flush(cap) {
    const st = this._state.get(cap);
    if (!st) { return Promise.resolve(false); }
    st.timer = null;
    const p = st.pending;
    st.pending = null;
    if (!p || this._destroyed) { return Promise.resolve(false); }
    if (p.value === st.value && this._now() - st.at < this.refreshMs) { this.stats.skippedSame++; return Promise.resolve(false); }
    return this._write(cap, st, p.value, p.write);
  }

  _write(cap, st, value, write) {
    st.value = value;
    st.at = this._now();
    this.stats.written++;
    try {
      return Promise.resolve(write(value)).then(() => true, (e) => { this._report(cap, e); return false; });
    } catch (e) {
      this._report(cap, e);
      return Promise.resolve(false);
    }
  }

  _report(cap, e) {
    if (typeof this._onError === 'function') { try { this._onError(cap, e); } catch (_e) { /* reporter must not throw */ } }
  }

  /** Writes every pending value now (used before a derived total is computed, and on delete). */
  flushAll() {
    const out = [];
    for (const [cap, st] of this._state) {
      if (st.timer) { this._clearTimer(st.timer); st.timer = null; }
      if (st.pending) { out.push(this._flush(cap)); }
    }
    return Promise.all(out);
  }

  destroy() {
    for (const st of this._state.values()) { if (st.timer) { this._clearTimer(st.timer); st.timer = null; } st.pending = null; }
    this._destroyed = true;
  }
}

/** Per-key log throttle: one line per key per `windowMs`, with the count of muted lines. Bounded keys. */
class KeyedLogThrottle {
  constructor({ windowMs = 60000, maxKeys = 64, now = Date.now, burst = 1 } = {}) {
    this.windowMs = windowMs; this.maxKeys = maxKeys; this._now = now; this._m = new Map();
    this.burst = Math.max(1, burst | 0); // lines allowed per key per window before muting
  }

  /** Returns the line to log (with a muted count suffix) or null when muted. */
  line(key, msg) {
    const now = this._now();
    const st = this._m.get(key);
    if (st && now - st.at < this.windowMs) {
      if (st.sent < this.burst) { st.sent++; return msg; }
      st.muted++; return null;
    }
    const suffix = st && st.muted ? ` (+${st.muted} muted in ${Math.round(this.windowMs / 1000)}s)` : '';
    this._m.delete(key);
    this._m.set(key, { at: now, muted: 0, sent: 1 });
    if (this._m.size > this.maxKeys) { this._m.delete(this._m.keys().next().value); }
    return `${msg}${suffix}`;
  }
}

module.exports = { MeterWriteCoalescer, KeyedLogThrottle };
