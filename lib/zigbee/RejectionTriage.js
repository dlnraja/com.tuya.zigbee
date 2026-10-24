'use strict';

/**
 * P3011: triage for process-level unhandled rejections.
 * Expected Zigbee outcomes (unsupported by design, READ_ONLY, timeout, transient radio errors,
 * unknown incoming frames) are not app bugs: they get ONE quiet log line per kind+message per
 * minute instead of an error-level 'UNHANDLED REJECTION' with the whole promise dump.
 * Anything else keeps the original error-level log.
 */

const { classifyZclError } = require('./ZclErrorKind');

const QUIET_KINDS = new Set(['unsupported', 'read_only', 'write_only', 'timeout', 'transient', 'unknown_incoming', 'invalid', 'denied']);
const WINDOW_MS = 60 * 1000;
const MAX_KEYS = 100;

function createTriage({ log, error, now = () => Date.now() } = {}) {
  const seen = new Map();
  const stats = { quiet: 0, loud: 0, suppressed: 0 };
  return {
    stats,
    handle(reason, promise) {
      let c;
      try { c = classifyZclError(reason); } catch (_e) { c = { kind: 'unknown' }; }
      if (!QUIET_KINDS.has(c.kind)) {
        stats.loud++;
        try { error('UNHANDLED REJECTION at:', promise, 'reason:', reason); } catch (_e) { /* no-op */ }
        return c.kind;
      }
      const msg = String((reason && reason.message) || reason).slice(0, 120);
      const key = `${c.kind}|${msg}`;
      const t = now();
      const prev = seen.get(key);
      if (prev && t - prev.at < WINDOW_MS) { prev.n++; stats.suppressed++; return c.kind; }
      if (!prev && seen.size >= MAX_KEYS) { seen.delete(seen.keys().next().value); }
      const extra = prev && prev.n ? ` (+${prev.n} in last min)` : '';
      seen.set(key, { at: t, n: 0 });
      stats.quiet++;
      try { log(`[ZCL-REJECT] ${c.kind}${c.statusName ? ` ${c.statusName}` : ''}: ${msg}${extra} (handled by fallback/retry; add .catch at call site)`); } catch (_e) { /* no-op */ }
      return c.kind;
    },
  };
}

module.exports = { createTriage, QUIET_KINDS };
