'use strict';

/**
 * IntelligentLazyLoad — Ship M (Homey-safe)
 *
 * WHY: Homey Pro ~64MB heap — defer/scale, never eager-load giant JSON at boot.
 * HOW: Thin facade over BootBudget + isMemoryPressure; Buffer JSON.parse.
 * WHO: Runtime lib/ (BOTH tracks). Does NOT replace BootBudget.
 * WHEN: deferred features, on-demand catalog refine, dynamic enrichers.
 * AGAINST: Second BootBudget clone; Redis; per-driver class lazy hacks.
 */

const fs = require('fs');
const BootBudget = require('./BootBudget');

let _isMemoryPressure = null;
function isMemoryPressure(opts) {
  if (!_isMemoryPressure) {
    try {
      _isMemoryPressure = require('../utils/NetworkResilience').isMemoryPressure;
    } catch {
      _isMemoryPressure = () => false;
    }
  }
  return _isMemoryPressure(opts || { heapLimit: 42 * 1024 * 1024 });
}

const _cache = new Map();

/**
 * Load JSON via Buffer (avoids giant UTF-16 intermediate string).
 * @param {string} filePath
 * @param {{ gc?: boolean }} [opts]
 */
function loadJsonBuffer(filePath, opts = {}) {
  if (!fs.existsSync(filePath)) return null;
  try {
    if (opts.gc && typeof global.gc === 'function') {
      try { global.gc(); } catch { /* ignore */ }
    }
    const buf = fs.readFileSync(filePath);
    const data = JSON.parse(buf);
    if (opts.gc && typeof global.gc === 'function') {
      try { global.gc(); } catch { /* ignore */ }
    }
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * One-shot lazy factory. Under heap pressure returns fallback (default null).
 * @param {string} id
 * @param {() => any} factory
 * @param {{ fallback?: any, heapBytes?: number }} [opts]
 */
function lazyRequire(id, factory, opts = {}) {
  if (_cache.has(id)) return _cache.get(id);
  const bytes = opts.heapBytes;
  if (!BootBudget.shouldStartHeavyFeatures(bytes) || isMemoryPressure()) {
    return opts.fallback !== undefined ? opts.fallback : null;
  }
  try {
    const v = factory();
    _cache.set(id, v);
    return v;
  } catch {
    return opts.fallback !== undefined ? opts.fallback : null;
  }
}

/**
 * Run fn only when heap allows heavy work.
 * @param {() => any|Promise<any>} fn
 * @param {{ fallback?: any, heapBytes?: number }} [opts]
 */
async function whenHeapAllows(fn, opts = {}) {
  if (!BootBudget.shouldStartHeavyFeatures(opts.heapBytes) || isMemoryPressure()) {
    return opts.fallback !== undefined ? opts.fallback : null;
  }
  return fn();
}

function clearLazyCache(id) {
  if (id) _cache.delete(id);
  else _cache.clear();
}

module.exports = {
  loadJsonBuffer,
  lazyRequire,
  whenHeapAllows,
  clearLazyCache,
  isMemoryPressure,
  BootBudget,
};
