'use strict';

/**
 * IntelligentLazyLoad — Ship M / P2586 (Homey-safe)
 *
 * WHY: Homey Pro ~64MB RSS — defer/scale, never eager-load giant JSON at boot.
 * HOW: Facade over BootBudget (heap+RSS) + Buffer JSON.parse + LRU lazy cache.
 * WHO: Runtime lib/ (BOTH tracks). Does NOT replace BootBudget.
 * WHEN: deferred features, on-demand catalog refine, dynamic enrichers.
 * AGAINST: Second BootBudget clone; Redis; per-driver class lazy hacks;
 *          utf8→string→JSON.parse double allocation on large files.
 */

const fs = require('fs');
const BootBudget = require('./BootBudget');

const DEFAULT_MAX_JSON_BYTES = 2 * 1024 * 1024;
const DEFAULT_CACHE_MAX = 24;

let _isMemoryPressure = null;
function isMemoryPressure(opts) {
  if (!_isMemoryPressure) {
    try {
      _isMemoryPressure = require('../utils/NetworkResilience').isMemoryPressure;
    } catch {
      _isMemoryPressure = () => false;
    }
  }
  try {
    if (BootBudget.isHeapCritical(opts && opts.heapBytes)) return true;
  } catch { /* soft */ }
  // WHY(P2586): RSS gate only on Homey LIVE_RSS — IDE/unit hosts have huge process RSS
  if (!BootBudget.shouldApplyLiveRss() && !(opts && opts.forceRss)) {
    try {
      const heap = (opts && opts.heapBytes) || (process.memoryUsage().heapUsed || 0);
      return heap > (opts?.heapLimit || 40 * 1024 * 1024);
    } catch {
      return false;
    }
  }
  return _isMemoryPressure(opts || {
    heapLimit: 40 * 1024 * 1024,
    rssLimit: BootBudget.RSS_HEAVY_MAX_BYTES,
  });
}

const _cache = new Map(); // id -> { value, at }
let _cacheMax = DEFAULT_CACHE_MAX;

function setLazyCacheMax(n) {
  const v = Number(n);
  if (Number.isFinite(v) && v >= 4) _cacheMax = Math.floor(v);
}

function _touchCache(id, value) {
  if (_cache.has(id)) _cache.delete(id);
  _cache.set(id, { value, at: Date.now() });
  while (_cache.size > _cacheMax) {
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
  return value;
}

/**
 * Parse JSON from Buffer (no UTF-16 intermediate string).
 * @param {Buffer} buf
 */
function parseJsonBuffer(buf) {
  if (!buf || !Buffer.isBuffer(buf)) return null;
  try {
    return JSON.parse(buf);
  } catch {
    return null;
  }
}

/**
 * Load JSON via Buffer (avoids giant UTF-16 intermediate string).
 * Never use buf.toString('utf8') before parse — that doubles heap (OOM).
 * @param {string} filePath
 * @param {{ gc?: boolean, maxBytes?: number }} [opts]
 */
function loadJsonBuffer(filePath, opts = {}) {
  if (!fs.existsSync(filePath)) return null;
  try {
    const st = fs.statSync(filePath);
    const max = Number(opts.maxBytes) > 0 ? Number(opts.maxBytes) : DEFAULT_MAX_JSON_BYTES;
    if (st.size > max) return null;
    if (opts.gc || isMemoryPressure()) BootBudget.maybeGc();
    let buf = fs.readFileSync(filePath);
    // WHY(P2678): JSON.parse(Buffer) — no UTF-16 intermediate
    const data = parseJsonBuffer(buf);
    buf = null;
    if (opts.gc || isMemoryPressure()) BootBudget.maybeGc();
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Load many small JSON files one-by-one (petit bout), merging into `into`.
 * Yields GC between files under pressure. Stops early if heap critical.
 * @param {string[]} filePaths
 * @param {{ into?: object, maxBytes?: number, maxFiles?: number, stopOnPressure?: boolean }} [opts]
 * @returns {{ merged: object, loaded: number, skipped: number }}
 */
function loadJsonBuffersBatched(filePaths, opts = {}) {
  const into = opts.into && typeof opts.into === 'object' ? opts.into : {};
  const maxBytes = Number(opts.maxBytes) > 0 ? Number(opts.maxBytes) : (200 * 1024);
  const maxFiles = Number(opts.maxFiles) > 0 ? Number(opts.maxFiles) : 64;
  let loaded = 0;
  let skipped = 0;
  const list = Array.isArray(filePaths) ? filePaths : [];
  for (let i = 0; i < list.length && loaded < maxFiles; i++) {
    if (opts.stopOnPressure !== false && isMemoryPressure()) {
      skipped += list.length - i;
      break;
    }
    const data = loadJsonBuffer(list[i], { gc: loaded % 4 === 3, maxBytes });
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      skipped++;
      continue;
    }
    Object.assign(into, data);
    loaded++;
  }
  return { merged: into, loaded, skipped };
}

/**
 * One-shot lazy factory. Under heap/RSS pressure returns fallback (default null).
 * @param {string} id
 * @param {() => any} factory
 * @param {{ fallback?: any, heapBytes?: number, cache?: boolean }} [opts]
 */
function lazyRequire(id, factory, opts = {}) {
  if (_cache.has(id)) {
    const hit = _cache.get(id);
    hit.at = Date.now();
    return hit.value;
  }
  const bytes = opts.heapBytes;
  if (!BootBudget.shouldStartHeavyFeatures(bytes) || isMemoryPressure()) {
    return opts.fallback !== undefined ? opts.fallback : null;
  }
  try {
    const v = factory();
    if (opts.cache === false) return v;
    return _touchCache(id, v);
  } catch {
    return opts.fallback !== undefined ? opts.fallback : null;
  }
}

/**
 * Run fn only when heap+RSS allow heavy work.
 * @param {() => any|Promise<any>} fn
 * @param {{ fallback?: any, heapBytes?: number }} [opts]
 */
async function whenHeapAllows(fn, opts = {}) {
  if (!BootBudget.shouldDoBackgroundWork(opts.heapBytes) || isMemoryPressure()) {
    return opts.fallback !== undefined ? opts.fallback : null;
  }
  return fn();
}

function clearLazyCache(id) {
  if (id) _cache.delete(id);
  else _cache.clear();
}

function lazyCacheSize() {
  return _cache.size;
}

/** Drop cache when Homey is under pressure (call from deferred boot / LiveData). */
function trimLazyCacheUnderPressure() {
  if (!isMemoryPressure() && BootBudget.shouldStartHeavyFeatures()) return 0;
  const before = _cache.size;
  _cache.clear();
  BootBudget.maybeGc();
  return before;
}

module.exports = {
  loadJsonBuffer,
  loadJsonBuffersBatched,
  parseJsonBuffer,
  lazyRequire,
  whenHeapAllows,
  clearLazyCache,
  trimLazyCacheUnderPressure,
  lazyCacheSize,
  setLazyCacheMax,
  isMemoryPressure,
  BootBudget,
  DEFAULT_MAX_JSON_BYTES,
};
