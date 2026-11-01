'use strict';

/**
 * DeviceDiagSnapshot (P3198)
 * WHY: diag fb5be1fe (Zigbee energy meter pairs, reports nothing) carried only
 * app startup lines — no mfr/pid/clusters/DPs, so nothing could be fixed.
 * Every paired device now gets ONE compact, anonymised line in the app log:
 * at boot (staggered), every few hours, on a first-seen DP the device does not
 * own, and at pairing end. Bounded: WeakMap per device (freed with the device),
 * max 24 DPs, max 3 errors, strings truncated. Never logs IEEE, homeyId,
 * device/zone names, emails. Every entry point is try/catch — never throws.
 */

const MAX_DPS = 24;
const MAX_ERRS = 3;
const MAX_LINE = 1600;
const MAX_FRAMES = 12; // raw EF00 frames per device (unmapped kept first)
const FRAME_HEX = 48; // hex chars per frame (24 bytes)
const REDUMP_MS = 6 * 60 * 60 * 1000; // per device, periodic
const UNKNOWN_DUMP_MS = 10 * 60 * 1000; // rate limit for "new unknown DP" dumps

const _state = new WeakMap();

function _st(device) {
  if (!device || (typeof device !== 'object' && typeof device !== 'function')) {return null;}
  let s = _state.get(device);
  if (!s) {
    s = { dps: new Map(), errs: [], frames: [], lastDump: 0, unknownPending: false, errWrapped: false };
    _state.set(device, s);
  }
  return s;
}

function _type(v) {
  if (v === null || v === undefined) {return 'nil';}
  if (Buffer.isBuffer(v)) {return `buf${v.length}`;}
  if (Array.isArray(v)) {return `arr${v.length}`;}
  return typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? 'num' : typeof v === 'string' ? 'str' : 'obj';
}

/** Scrub anything that can identify a home from free text. */
function scrub(text, device) {
  let t = String(text == null ? '' : text).slice(0, 300);
  try {
    const name = typeof device?.getName === 'function' ? device.getName() : null;
    if (name && String(name).length >= 2) {t = t.split(String(name)).join('[NAME]');}
  } catch (_e) { /* soft */ }
  return t
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]')
    .replace(/\b(?:[0-9a-f]{2}[:-]){7}[0-9a-f]{2}\b/gi, '[IEEE]')
    .replace(/\b0x[0-9a-f]{16}\b/gi, '[IEEE]')
    .replace(/\b[0-9a-f]{16}\b/gi, '[IEEE]')
    .replace(/\b[0-9a-f]{24}\b/gi, '[ID]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[ID]');
}

/** Record one Tuya DP seen (owned=false → no mapping handled it). */
function recordDp(device, dp, dpType, value, owned, raw) {
  try {
    const s = _st(device);
    const id = Number(dp);
    if (!s || !Number.isFinite(id)) {return;}
    let e = s.dps.get(id);
    if (!e) {
      if (s.dps.size >= MAX_DPS) {return;}
      e = { t: null, vt: null, at: 0, n: 0, own: null };
      s.dps.set(id, e);
    }
    e.t = dpType == null ? e.t : String(dpType).slice(0, 8);
    e.vt = _type(value);
    e.at = Date.now();
    e.n = Math.min(e.n + 1, 99999);
    if (owned === true) {e.own = true;} else if (owned === false && e.own !== true) {
      if (e.own !== false) {s.unknownPending = true;}
      e.own = false;
    }
    _recordFrame(s, id, dpType, raw !== undefined ? raw : value, owned);
    if (s.unknownPending) {_maybeDumpUnknown(device, s);}
  } catch (_e) { /* never break DP path */ }
}

function _toHex(v) {
  try {
    if (Buffer.isBuffer(v)) {return { hex: v.toString('hex'), len: v.length };}
    if (Array.isArray(v) && v.every((x) => Number.isInteger(x) && x >= 0 && x < 256)) {return { hex: Buffer.from(v).toString('hex'), len: v.length };}
    if (typeof v === 'number' || typeof v === 'boolean') {return { hex: `v${v}`, len: 0 };}
    if (typeof v === 'string') {return { hex: `s${scrub(v).slice(0, 16)}`, len: v.length };}
  } catch (_e) { /* soft */ }
  return { hex: _type(v), len: 0 };
}

/** Bounded raw frame ring: identical consecutive frame → count++; when full, evict oldest mapped first. */
function _recordFrame(s, dp, dpType, raw, owned) {
  const { hex, len } = _toHex(raw);
  const h = hex.length > FRAME_HEX ? `${hex.slice(0, FRAME_HEX)}~` : hex;
  const last = s.frames.find((f) => f.dp === dp);
  if (last && last.hex === h) { last.n = Math.min(last.n + 1, 9999); last.at = Date.now(); return; }
  if (s.frames.length >= MAX_FRAMES) {
    let i = s.frames.findIndex((f) => f.own !== false);
    if (i < 0) {i = 0;}
    s.frames.splice(i, 1);
  }
  s.frames.push({ dp, t: dpType == null ? '?' : String(dpType).slice(0, 8), len, hex: h, own: owned, at: Date.now(), n: 1 });
}

function _framesText(s) {
  const fr = [...s.frames].sort((a, b) => (a.own === false ? 0 : 1) - (b.own === false ? 0 : 1) || b.at - a.at).slice(0, 8);
  return fr.map((f) => `dp${f.dp}/t${f.t}/l${f.len}:${f.hex}${f.n > 1 ? `x${f.n}` : ''}${f.own === false ? '!' : ''}@${_ago(f.at)}`).join(',');
}

function _zclText(device) {
  try {
    const rec = require('../zigbee/UnknownCommandSink').recent(device) || [];
    return rec.slice(-5).map((e) => `${e.ep != null ? e.ep : '?'}/${e.cluster}/c${e.cmd != null ? e.cmd : '?'}:${String(e.hex || '').slice(0, 32)}`).join(',');
  } catch (_e) { return ''; }
}

function recordError(device, msg) {
  try {
    const s = _st(device);
    if (!s) {return;}
    s.errs.push({ m: scrub(msg, device).slice(0, 120), at: Date.now() });
    if (s.errs.length > MAX_ERRS) {s.errs.shift();}
  } catch (_e) { /* soft */ }
}

/** Wrap device.error once so the last errors are captured (bounded ring). */
function _wrapErrors(device, s) {
  try {
    if (s.errWrapped || typeof device.error !== 'function') {return;}
    const orig = device.error;
    device.error = function p3198Error(...args) {
      try { recordError(device, args.map((a) => (a && a.message) || a).join(' ')); } catch (_e) { /* soft */ }
      return orig.apply(this, args);
    };
    s.errWrapped = true;
  } catch (_e) { /* soft */ }
}

function _ago(ms) {
  if (!ms) {return '-';}
  const d = Math.max(0, Date.now() - ms) / 1000;
  if (d < 90) {return `${Math.round(d)}s`;}
  if (d < 5400) {return `${Math.round(d / 60)}m`;}
  if (d < 172800) {return `${Math.round(d / 3600)}h`;}
  return `${Math.round(d / 86400)}d`;
}

function _hex(id) {
  const n = Number(id);
  return Number.isFinite(n) ? n.toString(16).padStart(4, '0') : String(id).slice(0, 24);
}

function _clusterIds(obj) {
  try {
    return Object.entries(obj || {}).slice(0, 24).map(([k, c]) => {
      const id = c && c.constructor && c.constructor.ID !== undefined ? c.constructor.ID : c && c.id !== undefined ? c.id : k;
      return _hex(id);
    });
  } catch (_e) { return []; }
}

function _endpoints(device) {
  try {
    const eps = device?.zclNode?.endpoints;
    if (!eps) {return null;}
    return Object.entries(eps).slice(0, 8).map(([epId, ep]) => {
      const inC = _clusterIds(ep?.clusters).join(',');
      const outC = _clusterIds(ep?.bindings).join(',');
      return `${epId}:in[${inC}]out[${outC}]`;
    }).join(' ');
  } catch (_e) { return null; }
}

function _identity(device) {
  let mfr = null; let pid = null;
  try {
    const { readZigbeeIdentity } = require('./FleetIdentityLog');
    const id = readZigbeeIdentity(device) || {};
    mfr = id.mfr; pid = id.pid;
  } catch (_e) { /* soft */ }
  const set = (k) => { try { return device?.getSetting?.(k); } catch (_e) { return null; } };
  const fw = [
    set('zb_app_version') != null ? `app:${set('zb_app_version')}` : null,
    set('zb_sw_build_id') ? `sw:${String(set('zb_sw_build_id')).slice(0, 24)}` : null,
    set('zb_hardware_version') != null ? `hw:${set('zb_hardware_version')}` : null,
  ].filter(Boolean).join('/');
  return { mfr, pid, fw };
}

/** Build the anonymised one-line snapshot; `idx` replaces any identifier. */
function buildLine(device, idx, reason) {
  try {
    const s = _st(device) || { dps: new Map(), errs: [], frames: [] };
    const id = _identity(device);
    let avail = '?';
    try { if (typeof device.getAvailable === 'function') {avail = device.getAvailable() ? '1' : '0';} } catch (_e) { /* soft */ }
    let caps = 0;
    try { caps = (device.getCapabilities?.() || []).length; } catch (_e) { /* soft */ }
    const dps = [...s.dps.entries()].sort((a, b) => a[0] - b[0])
      .map(([dp, e]) => `${dp}:${e.t || '?'}/${e.vt}@${_ago(e.at)}x${e.n}${e.own === false ? '!' : ''}`);
    const unk = [...s.dps.entries()].filter(([, e]) => e.own === false).map(([dp]) => dp);
    const errs = s.errs.map((e) => `${_ago(e.at)}:${e.m}`).join(' | ');
    const parts = [
      `[DIAG-DEV] #${idx} [IEEE-${idx}] why=${reason || 'snap'}`,
      `drv=${device?.driver?.id || '?'}`,
      `mfr=${id.mfr ? scrub(id.mfr).slice(0, 40) : 'ABSENT'}`,
      `pid=${id.pid ? scrub(id.pid).slice(0, 40) : 'ABSENT'}`,
      id.fw ? `fw=${id.fw}` : null,
      `avail=${avail}`,
      `caps=${caps}`,
      `ep=${_endpoints(device) || 'none'}`,
      `dps=${dps.length ? dps.join(',') : 'none'}`,
      unk.length ? `unmapped=${unk.join(',')}` : null,
      s.frames.length ? `raw=${_framesText(s)}` : null,
      (() => { const z = _zclText(device); return z ? `zcl_unk=${z}` : null; })(),
      errs ? `err=${errs}` : null,
    ].filter(Boolean);
    return parts.join(' ').slice(0, MAX_LINE);
  } catch (e) {
    return `[DIAG-DEV] #${idx} snapshot-failed`;
  }
}

function _appIndex(device) {
  try {
    const app = device?.homey?.app;
    if (!app?.homey?.drivers?.getDrivers) {return 0;}
    let i = 0;
    for (const drv of Object.values(app.homey.drivers.getDrivers())) {
      for (const d of drv.getDevices?.() || []) { i += 1; if (d === device) {return i;} }
    }
  } catch (_e) { /* soft */ }
  return 0;
}

function _emit(device, line) {
  try {
    const app = device?.homey?.app;
    const log = app && typeof app.log === 'function' ? app.log.bind(app) : typeof device.log === 'function' ? device.log.bind(device) : null;
    if (log) {log(line);}
  } catch (_e) { /* soft */ }
}

function dumpDevice(device, reason, idx) {
  try {
    const s = _st(device);
    if (!s) {return null;}
    _wrapErrors(device, s);
    s.lastDump = Date.now();
    s.unknownPending = false;
    const line = buildLine(device, idx || _appIndex(device), reason);
    _emit(device, line);
    return line;
  } catch (_e) { return null; }
}

function _maybeDumpUnknown(device, s) {
  if (Date.now() - (s.lastUnknownDump || 0) < UNKNOWN_DUMP_MS) {return;}
  s.lastUnknownDump = Date.now();
  dumpDevice(device, 'new-unmapped-dp');
}

/**
 * App-level: list every device, dump each one staggered (stepMs apart) so the
 * log never spikes. Re-dump only devices whose last dump is older than REDUMP_MS
 * unless force. Returns number of devices scheduled.
 */
function dumpAll(app, { reason = 'boot', stepMs = 1500, force = false } = {}) {
  try {
    if (!app?.homey?.drivers?.getDrivers) {return 0;}
    const list = [];
    for (const drv of Object.values(app.homey.drivers.getDrivers())) {
      for (const d of drv.getDevices?.() || []) {list.push(d);}
    }
    let n = 0;
    list.forEach((d, i) => {
      const s = _st(d);
      if (!s || (!force && Date.now() - s.lastDump < REDUMP_MS)) {return;}
      n += 1;
      const run = () => { if (!app._destroyed) {dumpDevice(d, reason, i + 1);} };
      try { app.homey.setTimeout(run, n * stepMs); } catch (_e) { run(); }
    });
    if (typeof app.log === 'function') {app.log(`[DIAG-DEV] ${list.length} device(s), ${n} snapshot(s) scheduled (${reason})`);}
    return n;
  } catch (_e) { return 0; }
}

module.exports = { recordDp, recordError, buildLine, dumpDevice, dumpAll, scrub, MAX_DPS, MAX_ERRS, MAX_FRAMES, REDUMP_MS, _state };
