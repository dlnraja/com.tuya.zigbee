'use strict';

/**
 * P3065 D13 (t582u) — one shared, bounded guard for every generic Flow card module.
 *
 * - Trigger fan-out: an identical (card, device, tokens) event inside `sameMs` is dropped
 *   (debounce of repeated reports), and each (card, device) may fire at most `perMin`
 *   times per rolling minute (no trigger storm from a chatty device).
 * - Autocomplete: results cached in a small LRU (TTL), cleared when a device is added or deleted.
 * Both maps have a hard size cap, so memory stays flat whatever the device count or report rate.
 */

class BoundedLRU {
  constructor(max) { this.max = max; this.map = new Map(); }
  get(k) {
    const v = this.map.get(k);
    if (v !== undefined) { this.map.delete(k); this.map.set(k, v); }
    return v;
  }
  set(k, v) {
    if (this.map.has(k)) {this.map.delete(k);}
    this.map.set(k, v);
    while (this.map.size > this.max) {this.map.delete(this.map.keys().next().value);}
  }
  clear() { this.map.clear(); }
  get size() { return this.map.size; }
}

const DEFAULTS = { sameMs: 1000, perMin: 60, keys: 1024, acMax: 64, acTtlMs: 30000 };

class FlowStormGuard {
  constructor(opts = {}) {
    this.o = { ...DEFAULTS, ...opts };
    this.now = opts.now || (() => Date.now());
    this._fires = new BoundedLRU(this.o.keys); // `${card}|${device}` -> { sig, at, winAt, n }
    this._ac = new BoundedLRU(this.o.acMax);
    this.dropped = 0;
  }

  /** Small token signature: primitives only, no deep copy. */
  static sig(tokens) {
    if (!tokens || typeof tokens !== 'object') {return String(tokens);}
    let s = '';
    for (const k in tokens) {s += `${k}=${tokens[k]};`;}
    return s;
  }

  /** true = fire, false = drop. `sameMs` may be overridden per card. */
  allow(cardId, deviceId, tokens, sameMs = this.o.sameMs) {
    const t = this.now();
    const key = `${cardId}|${deviceId || '-'}`;
    const sig = FlowStormGuard.sig(tokens);
    let e = this._fires.get(key);
    if (!e) { e = { sig: null, at: 0, winAt: t, n: 0 }; this._fires.set(key, e); }
    if (e.sig === sig && t - e.at < sameMs) { this.dropped++; return false; }
    if (t - e.winAt >= 60000) { e.winAt = t; e.n = 0; }
    if (e.n >= this.o.perMin) { this.dropped++; return false; }
    e.n++; e.sig = sig; e.at = t;
    return true;
  }

  acGet(key) {
    const e = this._ac.get(key);
    if (!e) {return undefined;}
    if (this.now() - e.at > this.o.acTtlMs) {return undefined;}
    return e.v;
  }

  acSet(key, v) { this._ac.set(key, { at: this.now(), v }); }

  /** Device added / deleted: autocomplete lists and fire slots may be stale. */
  invalidate() { this._ac.clear(); }

  stats() { return { fireKeys: this._fires.size, acKeys: this._ac.size, dropped: this.dropped }; }
}

/** One guard per app (host = FeatureFlowCards instance). */
function guardOf(host) {
  if (!host) {return new FlowStormGuard();}
  if (!host._flowStormGuard) {host._flowStormGuard = new FlowStormGuard();}
  return host._flowStormGuard;
}

module.exports = { FlowStormGuard, BoundedLRU, guardOf, DEFAULTS };
