'use strict';

const { safeSetTimeout, safeClearTimeout } = require('../utils/safe-timers');

/**
 * TuyaDpDetector — DP discovery helpers for Tuya LAN devices.
 * Behaviour notes: docs/automation/localtuya-study.md.
 *
 * Some devices (notably protocol 3.2 and many 3.3 "type_0d" firmwares) only
 * answer a status query that explicitly lists the DP ids wanted. To find
 * which DPs exist we probe likely ranges in small batches, always including
 * DP 1 (some firmwares ignore a request without it), and merge whatever
 * comes back. Payloads are kept small (device buffers are ~255 bytes).
 */

const DEFAULT_RANGES = Object.freeze([[1, 1], [2, 10], [11, 20], [21, 30], [100, 110]]);
const DEFAULT_CHUNK = 10;
const MAX_PAYLOAD_BYTES = 255;

function expandRanges(ranges = DEFAULT_RANGES) {
  const out = new Set();
  for (const r of ranges) {
    if (!Array.isArray(r) || r.length < 2) {continue;}
    const a = Math.max(1, Math.floor(r[0])); const b = Math.min(255, Math.floor(r[1]));
    for (let i = a; i <= b; i++) {out.add(i);}
  }
  return [...out].sort((x, y) => x - y);
}

/** Rough size of the JSON "dps" map {"1":null,...} for a list of ids. */
function estimatePayloadBytes(ids) {
  return JSON.stringify({ dps: Object.fromEntries(ids.map((i) => [String(i), null])) }).length + 40;
}

/**
 * Split DP ids into probe batches. DP 1 is prepended to every batch; batches
 * are shrunk if the estimated payload would exceed the device buffer.
 */
function buildProbePlan({ ranges = DEFAULT_RANGES, chunkSize = DEFAULT_CHUNK, skip = [] } = {}) {
  const skipSet = new Set((skip || []).map(Number));
  const ids = expandRanges(ranges).filter((i) => i !== 1 && !skipSet.has(i));
  const size = Math.max(1, Math.floor(chunkSize) || DEFAULT_CHUNK);
  const plan = [];
  let cur = [];
  for (const id of ids) {
    const next = [...cur, id];
    if (next.length > size || estimatePayloadBytes([1, ...next]) > MAX_PAYLOAD_BYTES) {
      if (cur.length) {plan.push([1, ...cur]);}
      cur = [id];
    } else {
      cur = next;
    }
  }
  if (cur.length) {plan.push([1, ...cur]);}
  if (!plan.length) {plan.push([1]);}
  return plan;
}

/** Infer a Tuya DP type from a reported value. */
function inferDpType(value) {
  if (typeof value === 'boolean') {return 'bool';}
  if (typeof value === 'number') {return Number.isInteger(value) ? 'value' : 'float';}
  if (typeof value === 'string') {
    if (/^[0-9a-fA-F]{12}$|^[0-9a-fA-F]{14}$/.test(value)) {return 'color';}
    if (/^[A-Za-z0-9+/]{4,}={0,2}$/.test(value) && value.length % 4 === 0 && value.length >= 8) {return 'raw';}
    return 'enum';
  }
  if (value === null || value === undefined) {return 'unknown';}
  return 'object';
}

/** Merge a dps reply into a detection map { id: { value, type } }, ignoring nulls. */
function mergeDetected(acc, dps) {
  const out = { ...acc || {} };
  if (!dps || typeof dps !== 'object') {return out;}
  for (const [k, v] of Object.entries(dps)) {
    if (v === null || v === undefined) {continue;}
    if (!/^\d+$/.test(k)) {continue;}
    out[k] = { value: v, type: inferDpType(v) };
  }
  return out;
}

/** Recognise the firmware reply that means "list the DPs explicitly". */
function isDpListRequiredError(errOrText) {
  const s = String((errOrText && errOrText.message) || errOrText || '').toLowerCase();
  return s.includes('data unvalid') || s.includes('data invalid');
}

/**
 * Run a probe plan through an injected query function.
 * @param {function(number[]): Promise<object|null>} queryFn  returns a dps map
 * @param {object} [opts] buildProbePlan options + { perProbeTimeoutMs, shouldStop }
 * @returns {Promise<object>} detection map
 */
async function runProbes(queryFn, opts = {}) {
  const plan = buildProbePlan(opts);
  const timeoutMs = opts.perProbeTimeoutMs || 3000;
  let acc = {};
  for (const batch of plan) {
    if (typeof opts.shouldStop === 'function' && opts.shouldStop()) {break;}
    let timer = null;
    try {
      const reply = await Promise.race([
        Promise.resolve().then(() => queryFn(batch)),
        new Promise((resolve) => { timer = safeSetTimeout(() => resolve(null), timeoutMs); }),
      ]);
      acc = mergeDetected(acc, reply && reply.dps ? reply.dps : reply);
    } catch (_e) {
      // a failing batch must never abort detection
    } finally {
      if (timer) {safeClearTimeout(timer);}
    }
  }
  return acc;
}

module.exports = {
  DEFAULT_RANGES,
  MAX_PAYLOAD_BYTES,
  expandRanges,
  estimatePayloadBytes,
  buildProbePlan,
  inferDpType,
  mergeDetected,
  isDpListRequiredError,
  runProbes,
};
