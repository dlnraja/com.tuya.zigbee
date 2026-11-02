'use strict';
// P3214 (02/11/2026, Bastien diag 7f72cffe "c3 crache souvent"): the app died with heap out of memory in
// JSON.parse of the 2 MB zigbee-OTA index while HEAP-SENTINEL already read 57 MB. The P3091 gate meant to
// stop that read process.memoryUsage() and returned early (= allowed) when it threw ENOENT
// (uv_resident_set_memory). Bastien's Homey is on that path (diag shows rss=0MB = V8 fallback), so the gate
// never fired. This helper reads the heap through safeMemoryUsage (V8 fallback) and never fails open
// silently. Optional work only: callers skip optional parses, never core control paths.
const { safeMemoryUsage } = require('./safeMemoryUsage');

function heapUsedMB(read = safeMemoryUsage) {
  try {
    const m = read();
    if (!m || m.src === 'none' || !Number.isFinite(m.heapUsed) || m.heapUsed <= 0) { return null; }
    return m.heapUsed / 1048576;
  } catch (_e) { return null; }
}

function heapAllows(limitMB, read) {
  const mb = heapUsedMB(read);
  return mb === null || mb <= limitMB;
}

function heapGate(limitMB, tag = 'HEAP-GATE', read) {
  const mb = heapUsedMB(read);
  if (mb !== null && mb > limitMB) { throw new Error(`[${tag}] skipped: heap ${Math.round(mb)} MB > ${limitMB} MB`); }
}

// Parsed value, or null when the text is too big or the heap too high, or the text is invalid. Never throws.
function safeJsonParse(text, { maxBytes = 512 * 1024, limitMB = 40, read } = {}) {
  if (typeof text !== 'string') { return null; }
  if (text.length > maxBytes) { return null; }
  if (!heapAllows(limitMB, read)) { return null; }
  try { return JSON.parse(text); } catch (_e) { return null; }
}

module.exports = { heapUsedMB, heapAllows, heapGate, safeJsonParse };
