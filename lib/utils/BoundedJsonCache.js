'use strict';
/**
 * BoundedJsonCache — load big read-only JSON data files lazily, at first use, into a bounded LRU
 * that the memwarn guard can drop.
 *
 * WHY: `require('x.json')` keeps the parsed object in Node's module cache for the life of the process
 * (dp_registry.json alone is ~2 MB of text, several times that parsed), and per-instance copies of the
 * reference made it unreleasable. Here: parse on first use, keep at most `maxEntries` files / `maxBytes`
 * of source text, evict least-recently-used, never cache a file bigger than the whole budget, and expose
 * clear() for MemwarnGuard. Async `get()` reads without blocking the event loop and de-duplicates
 * concurrent loads; `getSync()` is for callers that cannot await (same cache).
 */
const fs = require('fs');
const path = require('path');

class BoundedJsonCache {
  constructor({ maxEntries = 4, maxBytes = 16 * 1024 * 1024 } = {}) {
    this.maxEntries = Math.max(1, maxEntries);
    this.maxBytes = Math.max(1, maxBytes);
    this._map = new Map(); // abs path -> { value, bytes }
    this._inflight = new Map();
    this._bytes = 0;
    this.stats = { hits: 0, loads: 0, evictions: 0, clears: 0, bypass: 0 };
  }

  _touch(key, entry) { this._map.delete(key); this._map.set(key, entry); }

  _store(key, value, bytes) {
    if (bytes > this.maxBytes) { this.stats.bypass++; return; }
    const old = this._map.get(key);
    if (old) { this._bytes -= old.bytes; this._map.delete(key); }
    this._map.set(key, { value, bytes });
    this._bytes += bytes;
    while (this._map.size > this.maxEntries || this._bytes > this.maxBytes) {
      const first = this._map.keys().next().value;
      if (first === undefined || first === key && this._map.size === 1) break;
      this._bytes -= this._map.get(first).bytes;
      this._map.delete(first);
      this.stats.evictions++;
    }
  }

  getSync(file, fallback = null) {
    const key = path.resolve(file);
    const hit = this._map.get(key);
    if (hit) { this.stats.hits++; this._touch(key, hit); return hit.value; }
    try {
      const raw = fs.readFileSync(key);
      const value = JSON.parse(raw);
      this.stats.loads++;
      this._store(key, value, raw.length);
      return value;
    } catch (_e) { return fallback; }
  }

  async get(file, fallback = null) {
    const key = path.resolve(file);
    const hit = this._map.get(key);
    if (hit) { this.stats.hits++; this._touch(key, hit); return hit.value; }
    if (this._inflight.has(key)) return this._inflight.get(key);
    const p = (async () => {
      try {
        const raw = await fs.promises.readFile(key);
        // yield once so a big parse never starves timers queued behind the read
        await new Promise((r) => setImmediate(r));
        const value = JSON.parse(raw);
        this.stats.loads++;
        this._store(key, value, raw.length);
        return value;
      } catch (_e) { return fallback; } finally { this._inflight.delete(key); }
    })();
    this._inflight.set(key, p);
    return p;
  }

  clear() {
    const n = this._map.size;
    this._map.clear(); this._bytes = 0; this.stats.clears++;
    return n;
  }

  size() { return this._map.size; }
  bytes() { return this._bytes; }
}

let _shared = null;
function shared() { return _shared || (_shared = new BoundedJsonCache()); }
function clearShared() { return _shared ? _shared.clear() : 0; }

module.exports = { BoundedJsonCache, shared, clearShared };
