'use strict';

/**
 * safeMemoryUsage (P3045) — read the process memory figures without ever throwing.
 *
 * WHY: on some Homey Pro firmwares the resident-set read that backs process.memoryUsage()
 * (libuv uv_resident_set_memory) fails with ENOENT, and the whole call throws. That crashed
 * Universal Tuya 9.0.1506. The later guards caught the error but answered `{}` or 0, so every
 * heap gate (HeapSentinel, BootBudget, NetworkResilience, MemoryLeakDetector) then read
 * heap = 0 forever and never trimmed anything while the heap kept growing.
 * HOW: try process.memoryUsage() first; if it throws or returns nothing usable, take the heap
 * numbers from V8 itself (v8.getHeapStatistics(), no /proc access). RSS stays 0 when it cannot
 * be read, which keeps RSS gates in their previous "unknown" state instead of guessing.
 * Never throws. `src` tells callers which path answered ('process' | 'v8' | 'none').
 */

function _num(v) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; }

function safeMemoryUsage({ proc = process, v8mod = null } = {}) {
  try {
    const m = proc && typeof proc.memoryUsage === 'function' ? proc.memoryUsage() : null;
    if (m && Number.isFinite(Number(m.heapUsed))) {
      return { heapUsed: _num(m.heapUsed), heapTotal: _num(m.heapTotal), rss: _num(m.rss), external: _num(m.external), src: 'process' };
    }
  } catch (_e) { /* ENOENT uv_resident_set_memory: fall back to V8 below */ }
  try {
    const v8 = v8mod || require('v8');
    const s = v8.getHeapStatistics();
    return { heapUsed: _num(s.used_heap_size), heapTotal: _num(s.total_heap_size), rss: 0, external: _num(s.external_memory), src: 'v8' };
  } catch (_e) {
    return { heapUsed: 0, heapTotal: 0, rss: 0, external: 0, src: 'none' };
  }
}

module.exports = { safeMemoryUsage };
