'use strict';

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * LazyJSONLoader — OOM-safe fractional JSON loader with LRU cache
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Designed for Homey Pro (64MB V8 heap limit on older firmware):
 * - Deferred loading: JSON is parsed ONLY on first access, not at require() time
 * - LRU eviction: Configurable max cache entries to bound memory growth
 * - GC integration: Calls global.gc() before/after large operations when exposed
 * - Memory monitoring: Reports heap usage and triggers eviction at threshold
 * - Graceful degradation: Returns empty object/array on all failure paths
 * - Fallback paths: Multiple search paths for Homey runtime vs dev environment
 *
 * Usage:
 *   const loader = new LazyJSONLoader('data/fingerprints.json', { maxEntries: 1000 });
 *   const entry = loader.get('_TZE200_key');
 *   const all   = loader.getAll();
 *   loader.evict(); // Force-release memory
 *
 * @version 1.0.0
 */

const fs   = require('fs');
const path = require('path');

// ── Memory thresholds ──────────────────────────────────────────────────────
const HEAP_WARN_MB    = 48; // warn at 48MB heap used
const HEAP_EVICT_MB   = 56; // force evict at 56MB heap used
const GC_EVERY_N_OPS  = 500; // call GC every N lookups (if exposed)

// ── LRU cache node ─────────────────────────────────────────────────────────
class LRUNode {
  constructor(key, value) {
    this.key   = key;
    this.value = value;
    this.prev  = null;
    this.next  = null;
  }
}

// ── Minimal doubly-linked LRU map ──────────────────────────────────────────
class LRUCache {
  constructor(maxSize) {
    this._max  = maxSize;
    this._map  = new Map();
    this._head = new LRUNode(null, null); // sentinel head (most-recent end)
    this._tail = new LRUNode(null, null); // sentinel tail (least-recent end)
    this._head.next = this._tail;
    this._tail.prev = this._head;
  }

  _detach(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _prependToHead(node) {
    node.next = this._head.next;
    node.prev = this._head;
    this._head.next.prev = node;
    this._head.next = node;
  }

  get(key) {
    const node = this._map.get(key);
    if (!node) return undefined;
    // Move to front (most recently used)
    this._detach(node);
    this._prependToHead(node);
    return node.value;
  }

  set(key, value) {
    if (this._map.has(key)) {
      const node = this._map.get(key);
      node.value = value;
      this._detach(node);
      this._prependToHead(node);
      return;
    }
    const node = new LRUNode(key, value);
    this._map.set(key, node);
    this._prependToHead(node);
    // Evict least-recently-used if over capacity
    if (this._map.size > this._max) {
      const lru = this._tail.prev;
      this._detach(lru);
      this._map.delete(lru.key);
    }
  }

  has(key)   { return this._map.has(key); }
  get size() { return this._map.size; }
  clear()    { this._map.clear(); this._head.next = this._tail; this._tail.prev = this._head; }
  keys()     { return this._map.keys(); }
}

// ═══════════════════════════════════════════════════════════════════════════
// LazyJSONLoader
// ═══════════════════════════════════════════════════════════════════════════

class LazyJSONLoader {
  /**
   * @param {string} relPath     - Relative path to JSON file (from project root)
   * @param {object} [opts]
   * @param {number} [opts.maxEntries=2000]   - LRU cache max entries (0 = unlimited)
   * @param {boolean} [opts.keepAll=true]     - Keep full DB in memory after first load
   * @param {string[]} [opts.extraPaths]      - Additional search paths
   * @param {string} [opts.label]             - Log prefix label
   */
  constructor(relPath, opts = {}) {
    this._relPath    = relPath;
    this._maxEntries = opts.maxEntries !== undefined ? opts.maxEntries : 2000;
    this._keepAll    = opts.keepAll !== undefined ? opts.keepAll : true;
    this._label      = opts.label || path.basename(relPath, '.json');
    this._extraPaths = opts.extraPaths || [];

    // State
    this._data    = null;   // Full parsed object (null = not loaded)
    this._lru     = this._maxEntries > 0 ? new LRUCache(this._maxEntries) : null;
    this._loaded  = false;
    this._loading = false;
    this._opCount = 0;      // For GC scheduling
    this._filePath = null;  // Resolved path after first load
  }

  // ── Resolved search paths ──────────────────────────────────────────────

  _buildPaths() {
    const base = this._relPath;
    return [
      path.resolve(process.cwd(), base),
      path.resolve(__dirname, '../../', base),
      path.resolve(__dirname, '../', base),
      path.resolve('/app', base),
      ...this._extraPaths.map(p => path.resolve(p, base))
    ];
  }

  // ── GC helper ─────────────────────────────────────────────────────────

  _gc(label) {
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (_) {}
    }
  }

  // ── Memory check ──────────────────────────────────────────────────────

  _heapUsedMB() {
    try { return process.memoryUsage().heapUsed / 1024 / 1024; } catch (_) { return 0; }
  }

  _checkMemory() {
    const usedMB = this._heapUsedMB();
    if (usedMB >= HEAP_EVICT_MB) {
      console.warn(`[${this._label}] ⚠️ Heap ${usedMB.toFixed(0)}MB ≥ ${HEAP_EVICT_MB}MB — evicting full DB`);
      this.evict();
    } else if (usedMB >= HEAP_WARN_MB) {
      console.warn(`[${this._label}] ⚠️ Heap ${usedMB.toFixed(0)}MB — approaching limit`);
    }
  }

  // ── Core load ─────────────────────────────────────────────────────────

  _load() {
    if (this._loaded || this._loading) return;
    this._loading = true;

    this._gc('pre-load');

    const paths = this._buildPaths();
    for (const fpath of paths) {
      try {
        if (!fs.existsSync(fpath)) continue;

        // Read as Buffer (lives in C++ heap, halves JS heap pressure)
        let buf = fs.readFileSync(fpath);
        this._data = JSON.parse(buf);
        buf = null; // Release C++ heap reference immediately

        this._gc('post-load');

        this._filePath = fpath;
        this._loaded   = true;
        this._loading  = false;

        const count = Array.isArray(this._data)
          ? this._data.length
          : Object.keys(this._data).length;

        console.log(`[${this._label}] ✅ Lazy-loaded ${count} entries from ${path.relative(process.cwd(), fpath)}`);

        // Pre-warm LRU with first N entries to avoid cold-start latency
        if (this._lru && !Array.isArray(this._data)) {
          let n = 0;
          for (const [k, v] of Object.entries(this._data)) {
            this._lru.set(k, v);
            if (++n >= Math.min(200, this._maxEntries / 4)) break;
          }
        }

        return;
      } catch (err) {
        console.error(`[${this._label}] ⚠️ Failed to load ${fpath}: ${err.message}`);
      }
    }

    // All paths failed
    console.error(`[${this._label}] 💀 All paths failed — using empty database`);
    this._data    = {};
    this._loaded  = true;
    this._loading = false;
    this._gc('load-failed');
  }

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * Ensure the database is loaded (triggers lazy load on first call).
   * Returns the full data object.
   */
  getAll() {
    if (!this._loaded) this._load();
    this._scheduleGC();
    return this._data;
  }

  /**
   * Look up a single key (object-mode only).
   * Uses LRU cache when maxEntries > 0.
   */
  get(key) {
    if (!this._loaded) this._load();
    this._scheduleGC();

    if (!key || Array.isArray(this._data)) {
      return Array.isArray(this._data) ? this._data : null;
    }

    // Check LRU cache first
    if (this._lru) {
      const cached = this._lru.get(key);
      if (cached !== undefined) return cached;
    }

    const value = this._data[key];
    if (value !== undefined && this._lru) {
      this._lru.set(key, value);
    }

    // Optional: evict full DB from memory if only LRU cache is needed
    if (!this._keepAll && this._lru) {
      this._evictData();
    }

    return value !== undefined ? value : null;
  }

  /**
   * Check if a key exists.
   */
  has(key) {
    if (!this._loaded) this._load();
    if (this._lru && this._lru.has(key)) return true;
    return this._data ? key in this._data : false;
  }

  /**
   * Get all keys of the loaded database.
   */
  keys() {
    if (!this._loaded) this._load();
    return this._data ? Object.keys(this._data) : [];
  }

  /**
   * Get count of entries.
   */
  get size() {
    if (!this._loaded) this._load();
    if (!this._data) return 0;
    return Array.isArray(this._data) ? this._data.length : Object.keys(this._data).length;
  }

  /**
   * Mutate or add an entry (for runtime updates).
   */
  set(key, value) {
    if (!this._loaded) this._load();
    if (this._data) this._data[key] = value;
    if (this._lru) this._lru.set(key, value);
  }

  /**
   * Force-evict the full data from memory.
   * LRU cache entries are preserved.
   * Call when memory is tight and only lookups (no iteration) are needed.
   */
  evict() {
    if (!this._keepAll || !this._data) return;
    const before = this._heapUsedMB();
    this._evictData();
    this._gc('evict');
    const after = this._heapUsedMB();
    console.log(`[${this._label}] 🗑️ Evicted full DB: ${before.toFixed(0)}MB → ${after.toFixed(0)}MB`);
  }

  _evictData() {
    this._data   = null;
    this._loaded = false; // Allow reload on next getAll()
  }

  /**
   * Get memory usage statistics.
   */
  stats() {
    return {
      label:      this._label,
      loaded:     this._loaded,
      heapUsedMB: this._heapUsedMB().toFixed(1),
      lruSize:    this._lru ? this._lru.size : 'disabled',
      filePath:   this._filePath || '(not loaded)',
    };
  }

  // ── Periodic GC scheduling ────────────────────────────────────────────

  _scheduleGC() {
    this._opCount++;
    if (this._opCount % GC_EVERY_N_OPS === 0) {
      this._checkMemory();
      this._gc('periodic');
    }
  }
}

module.exports = LazyJSONLoader;
