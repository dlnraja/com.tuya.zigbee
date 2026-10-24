'use strict';

/**
 * P3023: BoundedMap — a Map with a HARD entry cap (LRU eviction) and an optional TTL.
 *
 * WHY: every per-device / per-app cache in the unknown-command, method-chain and smart layers
 * must have a fixed ceiling whatever the traffic (Homey apps run in a ~70-100 MB heap, less on
 * Homey Pro 2019 / Bridge). A plain Map grows with every new key; this one never exceeds `max`.
 *
 *  - get() refreshes recency (delete + re-insert keeps Map insertion order = LRU order);
 *  - set() evicts the least recently used entries beyond `max`;
 *  - entries older than `ttlMs` are invisible to get/has and pruned lazily from the LRU head
 *    (amortised O(1): only expired head entries are visited);
 *  - prune(now) / clear() / trim(n) are used by MemoryBudget under pressure.
 * Pure, no timers, never throws on bad input.
 */
class BoundedMap {
  /**
   * @param {{max?: number, ttlMs?: number, now?: () => number}} [opts]
   */
  constructor(opts = {}) {
    this.max = Math.max(1, Math.floor(Number(opts.max) || 64));
    this.ttlMs = Number(opts.ttlMs) > 0 ? Number(opts.ttlMs) : 0;
    this._now = typeof opts.now === 'function' ? opts.now : Date.now;
    this._m = new Map(); // key -> { v, t }
    this.evictions = 0;
  }

  get size() { return this._m.size; }

  _expired(e, now) { return this.ttlMs > 0 && now - e.t > this.ttlMs; }

  has(key, now = this._now()) {
    const e = this._m.get(key);
    if (!e) { return false; }
    if (this._expired(e, now)) { this._m.delete(key); return false; }
    return true;
  }

  get(key, now = this._now()) {
    const e = this._m.get(key);
    if (!e) { return undefined; }
    if (this._expired(e, now)) { this._m.delete(key); return undefined; }
    this._m.delete(key);
    this._m.set(key, e);
    return e.v;
  }

  /** Read without touching recency. */
  peek(key) { const e = this._m.get(key); return e ? e.v : undefined; }

  set(key, value, now = this._now()) {
    if (this._m.has(key)) { this._m.delete(key); }
    this._m.set(key, { v: value, t: now });
    this._pruneHead(now);
    while (this._m.size > this.max) { this._m.delete(this._m.keys().next().value); this.evictions++; }
    return this;
  }

  delete(key) { return this._m.delete(key); }

  clear() { this._m.clear(); }

  _pruneHead(now) {
    if (!this.ttlMs) { return; }
    for (const [k, e] of this._m) {
      if (!this._expired(e, now)) { break; }
      this._m.delete(k);
    }
  }

  /** Drop every expired entry (full scan; used by the memory budget, not on hot paths). */
  prune(now = this._now()) {
    if (!this.ttlMs) { return 0; }
    let n = 0;
    for (const [k, e] of this._m) { if (this._expired(e, now)) { this._m.delete(k); n++; } }
    return n;
  }

  /** Keep only the `keep` most recent entries. */
  trim(keep = Math.ceil(this.max / 2)) {
    let n = 0;
    while (this._m.size > Math.max(0, keep)) { this._m.delete(this._m.keys().next().value); n++; }
    return n;
  }

  *keys() { for (const k of this._m.keys()) { yield k; } }

  *entries() { for (const [k, e] of this._m) { yield [k, e.v]; } }

  toJSON() { return { size: this._m.size, max: this.max, ttlMs: this.ttlMs, evictions: this.evictions }; }
}

/**
 * Short, bounded textual form of any value for logs / Flow tokens / change detection.
 * Never JSON.stringify()s an arbitrary object graph: buffers → hex prefix, arrays/objects →
 * shallow, depth-1, bounded number of keys. Result length ≤ max.
 */
function brief(value, max = 64) {
  const cap = Math.max(8, Number(max) || 64);
  try {
    if (value === null || value === undefined) { return String(value); }
    const t = typeof value;
    if (t === 'number' || t === 'boolean' || t === 'bigint') { return String(value).slice(0, cap); }
    if (t === 'string') { return value.length > cap ? `${value.slice(0, cap - 1)}…` : value; }
    if (Buffer.isBuffer(value)) {
      const hex = value.subarray(0, Math.floor((cap - 8) / 2)).toString('hex');
      return value.length * 2 > hex.length ? `${hex}~${value.length}`.slice(0, cap) : hex;
    }
    if (Array.isArray(value)) {
      const parts = [];
      let len = 2;
      for (let i = 0; i < value.length && len < cap; i++) {
        const v = value[i];
        const s = v !== null && typeof v === 'object' ? Array.isArray(v) ? `[${v.length}]` : '{…}' : String(v);
        parts.push(s); len += s.length + 1;
      }
      return `[${parts.join(',')}${parts.length < value.length ? `,…${value.length}` : ''}]`.slice(0, cap);
    }
    if (t === 'object') {
      if (value.type === 'Buffer' && Array.isArray(value.data)) { return brief(Buffer.from(value.data.slice(0, cap)), cap); }
      const parts = [];
      let len = 2;
      let n = 0;
      for (const k in value) {
        if (!Object.prototype.hasOwnProperty.call(value, k)) { continue; }
        if (len >= cap || n >= 16) { parts.push('…'); break; }
        const v = value[k];
        const s = `${k}:${v !== null && typeof v === 'object' ? Array.isArray(v) ? `[${v.length}]` : '{…}' : String(v)}`;
        parts.push(s); len += s.length + 1; n++;
      }
      return `{${parts.join(',')}}`.slice(0, cap);
    }
    return String(value).slice(0, cap);
  } catch (_e) {
    return '';
  }
}

/** 32-bit FNV-1a of a string (compact change-detection keys instead of long strings). */
function fnv1a(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

module.exports = { BoundedMap, brief, fnv1a };
