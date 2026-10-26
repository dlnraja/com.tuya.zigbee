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

module.exports = { formatRaw, compact, shouldLogDp, isVerbose, MAX_RAW };
