'use strict';
// P3065: per-DP receive log volume. Full lines when developer_debug_mode is on (app settings);
// otherwise log the first 3 frames of each DP, every value change, and every 50th repeat,
// with the raw payload truncated to 96 chars. Diagnostic counts stay exact in stats.count.
const MAX_RAW = 96;

function formatRaw(rawDisplay, verbose) {
  let s;
  try { s = JSON.stringify(rawDisplay); } catch (_e) { s = String(rawDisplay); }
  if (s === undefined) {s = String(rawDisplay);}
  if (!verbose && s.length > MAX_RAW) {s = `${s.slice(0, MAX_RAW)}…(+${s.length - MAX_RAW})`;}
  return s;
}

function bufReplacer(_k, v) {
  if (v && v.type === 'Buffer' && Array.isArray(v.data)) {
    try { return `hex:${Buffer.from(v.data).toString('hex')}`; } catch (_e) { return v; }
  }
  return v;
}

// Compact one-line JSON for frame logs: Buffers as hex, truncated unless verbose (verbose = historical output).
function compact(value, verbose) {
  if (verbose) {
    try { return JSON.stringify(value); } catch (_e) { return String(value); }
  }
  let s;
  try { s = Buffer.isBuffer(value) ? `hex:${value.toString('hex')}` : JSON.stringify(value, bufReplacer); } catch (_e) { s = String(value); }
  if (s === undefined) {s = String(value);}
  return s.length > MAX_RAW ? `${s.slice(0, MAX_RAW)}…(+${s.length - MAX_RAW})` : s;
}

function shouldLogDp(stats, raw, verbose) {
  if (verbose) {return true;}
  const changed = stats.lastRaw !== raw;
  stats.lastRaw = raw;
  return changed || stats.count <= 3 || stats.count % 50 === 0;
}

function isVerbose(device) {
  try { return !!(device && device.homey && device.homey.app && device.homey.app.developerDebugMode); } catch (_e) { return false; }
}

// P3065: duplicate-suppressed lines are by definition unchanged values; log the
// first 3 per DP then every 50th (with a count) unless verbose. Bounded: DP ids <= 255.
function shouldLogDup(owner, dp, verbose) {
  if (verbose || !owner) {return true;}
  const m = owner._p3065DupLogN || (owner._p3065DupLogN = Object.create(null));
  const k = String(dp).slice(0, 8);
  if (!(k in m) && Object.keys(m).length >= 256) {owner._p3065DupLogN = Object.create(null); return true;}
  const n = (m[k] || 0) + 1;
  owner._p3065DupLogN[k] = n;
  return n <= 3 || n % 50 === 0;
}

module.exports = { formatRaw, compact, shouldLogDp, isVerbose, shouldLogDup, MAX_RAW };
