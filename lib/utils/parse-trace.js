'use strict';

/**
 * Stderr breadcrumbs for large app-owned JSON.parse calls.
 *
 * A native V8 abort does not enter catch. The before line is written
 * before JSON.parse allocates the result. This does not wrap JSON.parse
 * globally and it does not name a parse Homey performs before app.js runs.
 *
 * Lines are fixed tokens: id, seq, bytes, ms, boot age, heap, rss.
 * No payload, path, stack, or Error.message.
 */

const MIN_BYTES = 8192;
const MAX_LINES = 64;
const MAX_PER_ID = 3;
const ID_RE = /^[a-z0-9_.:-]{1,48}$/;
const CATS = new Set(['parse', 'io', 'enoent', 'range']);
const BOOT = Date.now();

let seq = 0;
let lines = 0;
const perId = new Map();

function enabled() {
  return process.env.PARSE_TRACE !== '0';
}

function allowId(id) {
  const s = String(id || '');
  return ID_RE.test(s) ? s : 'redacted';
}

function sample() {
  try {
    const { safeMemoryUsage } = require('./safeMemoryUsage');
    const m = safeMemoryUsage();
    return { heap: m.heapUsed | 0, rss: m.rss | 0 };
  } catch (_) {
    return { heap: -1, rss: -1 };
  }
}

function writeLine(line) {
  if (!enabled() || lines >= MAX_LINES) {return false;}
  lines += 1;
  try {
    process.stderr.write(line);
  } catch (_) { /* stderr itself must not crash the app */ }
  return true;
}

function bootMark(id) {
  const label = allowId(id);
  const mem = sample();
  writeLine(`[PARSE] boot id=${label} proc=${process.pid} seq=${++seq} boot=0 heap=${mem.heap} rss=${mem.rss}\n`);
}

const _phaseAt = new Map();

/** Startup phase mark. note is a short version or millisecond count, never free text. */
function phase(id, note) {
  const label = allowId(id);
  const extra = allowId(note || 'na');
  const now = Date.now();
  if (label.endsWith('-start')) {_phaseAt.set(label, now);}
  let ms = 0;
  if (label.endsWith('-end')) {
    const start = _phaseAt.get(label.replace(/-end$/, '-start'));
    if (start) {ms = now - start;}
    _phaseAt.delete(label.replace(/-end$/, '-start'));
  }
  const mem = sample();
  writeLine(`[PARSE] phase id=${label} note=${extra} ms=${ms} proc=${process.pid} boot=${now - BOOT} heap=${mem.heap} rss=${mem.rss}\n`);
}

function beforeParse(id, bytes) {
  const n = Number(bytes) || 0;
  if (n < MIN_BYTES) {return null;}
  const label = allowId(id);
  const seen = perId.get(label) || 0;
  if (seen >= MAX_PER_ID) {return null;}
  perId.set(label, seen + 1);
  const s = ++seq;
  const mem = sample();
  writeLine(`[PARSE] before id=${label} proc=${process.pid} seq=${s} bytes=${n} boot=${Date.now() - BOOT} heap=${mem.heap} rss=${mem.rss}\n`);
  return { id: label, seq: s, t0: Date.now(), bytes: n };
}

function afterParse(tok) {
  if (!tok) {return;}
  const mem = sample();
  writeLine(`[PARSE] after id=${tok.id} seq=${tok.seq} bytes=${tok.bytes} ms=${Date.now() - tok.t0} boot=${Date.now() - BOOT} heap=${mem.heap} rss=${mem.rss}\n`);
}

function errorParse(tok, category) {
  if (!tok) {return;}
  const cat = CATS.has(category) ? category : 'parse';
  const mem = sample();
  writeLine(`[PARSE] error id=${tok.id} seq=${tok.seq} bytes=${tok.bytes} cat=${cat} boot=${Date.now() - BOOT} heap=${mem.heap} rss=${mem.rss}\n`);
}

/** Parse a buffer. Rethrows the original error after the error line. */
function parseJsonBuffer(id, buf) {
  const bytes = buf && buf.length ? buf.length : 0;
  const tok = beforeParse(id, bytes);
  try {
    const data = JSON.parse(buf);
    afterParse(tok);
    return data;
  } catch (err) {
    errorParse(tok, err && err.code === 'ENOENT' ? 'enoent' : 'parse');
    throw err;
  }
}

const deviceIds = new WeakMap();
let deviceN = 0;
const detailCounts = new Map();
const dropCounts = new Map();
const MAX_DETAIL_KEYS = 128;
const KINDS = new Set(['init', 'lookup', 'map', 'decode', 'tx-attempt', 'tx-sent', 'tx-fail', 'rx-report', 'rx-ack', 'queue', 'retry', 'lifecycle']);

function deviceRef(obj) {
  if (!obj || typeof obj !== 'object') {return 'd0';}
  let id = deviceIds.get(obj);
  if (id) {return id;}
  deviceN += 1;
  id = deviceN > 400 ? 'dX' : `d${deviceN}`;
  try { deviceIds.set(obj, id); } catch (_) { return 'd0'; }
  return id;
}

function hwId(value) {
  const s = String(value || '').trim();
  if (/^_?[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/.test(s)) {return s;}
  return 'redacted';
}

function valueSummary(value) {
  if (typeof value === 'boolean') {return value ? 'bool:1' : 'bool:0';}
  if (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 1e9) {return `num:${value}`;}
  if (typeof value === 'string') {return `str:${value.length}`;}
  if (value && typeof value.length === 'number' && !Array.isArray(value)) {return `bin:${value.length | 0}`;}
  if (Array.isArray(value)) {return `arr:${value.length}`;}
  if (value == null) {return 'null';}
  return 'other';
}

function allowDetail(key) {
  let bucket = key;
  if (!detailCounts.has(bucket) && detailCounts.size >= MAX_DETAIL_KEYS) {bucket = 'overflow';}
  const cap = process.env.DIAG_TRACE === '1' ? 8 : 2;
  const n = detailCounts.get(bucket) || 0;
  if (n >= cap) {
    const d = (dropCounts.get(bucket) || 0) + 1;
    dropCounts.set(bucket, d);
    if (d === 1 || d % 32 === 0) {
      const mem = sample();
      writeLine(`[PARSE] drop id=${allowId(bucket)} n=${d} proc=${process.pid} boot=${Date.now() - BOOT} heap=${mem.heap} rss=${mem.rss}\n`);
    }
    return false;
  }
  detailCounts.set(bucket, n + 1);
  return true;
}

function noteBudget(b) {
  const n = (v) => (Number.isFinite(Number(v)) ? (Number(v) | 0) : -1);
  const src = b || {};
  const mem = sample();
  writeLine(`[PARSE] budget shards=${n(src.shards)}/${n(src.shardCap)} high=${n(src.shardHigh)} cache=${n(src.cache)}/${n(src.cacheCap)} high=${n(src.cacheHigh)} evict=${n(src.cacheEvict)} proc=${process.pid} boot=${Date.now() - BOOT} heap=${mem.heap} rss=${mem.rss}\n`);
}

/**
 * One device/protocol breadcrumb. Does not transmit, store payloads, or throw.
 * dir distinguishes attempt, sent, report and ack. Detailed lines are capped;
 * later events increment a dropped counter.
 */
function traceDevice(kind, device, fields) {
  try {
    if (!KINDS.has(kind)) {return;}
    const f = fields || {};
    const dev = device && typeof device === 'object' ? deviceRef(device) : 'd0';
    const key = device && typeof device === 'object'
      ? `${kind}.${dev}`
      : `${kind}.${hwId(f.mfr)}.${hwId(f.pid)}`;
    if (!allowDetail(key)) {return;}
    const mem = sample();
    const parts = [
      `[PARSE] ${kind}`,
      `dev=${dev}`,
      `drv=${allowId(f.driver || 'driver')}`,
      `mfr=${hwId(f.mfr)}`,
      `pid=${hwId(f.pid)}`,
    ];
    if (f.ep != null) {parts.push(`ep=${Number(f.ep) | 0}`);}
    if (f.cluster != null) {parts.push(`cl=${Number(f.cluster) >>> 0}`);}
    if (f.cmd != null) {parts.push(`cmd=${Number(f.cmd) & 255}`);}
    if (f.dp != null) {parts.push(`dp=${Number(f.dp) & 255}`);}
    if (f.dir) {parts.push(`dir=${allowId(f.dir)}`);}
    if ('value' in f) {parts.push(`v=${valueSummary(f.value)}`);}
    parts.push(`proc=${process.pid}`, `seq=${++seq}`, `boot=${Date.now() - BOOT}`, `heap=${mem.heap}`, `rss=${mem.rss}`);
    writeLine(`${parts.join(' ')}\n`);
  } catch (_) { /* tracing must not break the device */ }
}

function hwFromDevice(device) {
  let mfr = '';
  let pid = '';
  let driver = 'driver';
  try { mfr = device && device.getSetting ? device.getSetting('zb_manufacturer_name') : ''; } catch (_) { mfr = ''; }
  try { pid = device && device.getSetting ? device.getSetting('zb_model_id') : ''; } catch (_) { pid = ''; }
  try { driver = (device && device.driver && device.driver.id) || driver; } catch (_) { driver = 'driver'; }
  return { mfr, pid, driver };
}

function _resetParseTraceForTests() {
  seq = 0;
  lines = 0;
  perId.clear();
  detailCounts.clear();
  dropCounts.clear();
  _phaseAt.clear();
  deviceN = 0;
}

module.exports = {
  MIN_BYTES,
  MAX_LINES,
  MAX_PER_ID,
  bootMark,
  phase,
  noteBudget,
  beforeParse,
  afterParse,
  errorParse,
  parseJsonBuffer,
  traceDevice,
  hwFromDevice,
  valueSummary,
  deviceRef,
  _resetParseTraceForTests,
};
