'use strict';

/**
 * P3207 RawAdaptiveObserver — raw-data level of docs/rules/DYNAMIC_ADAPTATION.md (t778u/t780u).
 *
 * Every unknown EF00 DP and unknown ZCL attribute report passes here (via UnknownDPLogger).
 *  - Bounded LRU per device (MAX_KEYS): id, type, min/max, count. No personal data.
 *  - Inference is conservative and reuses the KB: exact couple catalogue (DpCatalogDecoder) first,
 *    then the report-confirmed family layer (InferredDpLayer, 3 valid reports, one bad = rejected).
 *    ZCL: only the read-only measurement clusters of DynamicBindingAdapter.MEASURE.
 *  - A capability is ADDED only at high confidence, only from ADDITIVE (read-only) caps, never
 *    removed, never added when the driver owns it or the catalogue vetoes it.
 *  - Learned mapping persisted in store `dyn_learned` (≤ MAX_LEARNED).
 *  - Kill switch: device setting/store `dyn_adapt_off` = true, or env HOMEY_DYN_ADAPT=0.
 * Zero TX. Never throws.
 */

const MAX_KEYS = 24;
const MAX_LEARNED = 16;
const ZCL_CONFIRM_N = 2;
const EXACT_CONFIRM_N = 2;
const STORE_KEY = 'dyn_learned';

// WHY: only read-only measurements/alarms are auto-added; a controllable cap could act on a guess.
const ADDITIVE = /^(measure_[a-z0-9_]+|meter_[a-z0-9_]+|alarm_battery)$/;

function killed(device) {
  try {
    if (process.env.HOMEY_DYN_ADAPT === '0') {return true;}
    const s = typeof device.getSetting === 'function' ? device.getSetting('dyn_adapt_off') : null;
    const st = typeof device.getStoreValue === 'function' ? device.getStoreValue('dyn_adapt_off') : null;
    return s === true || st === true;
  } catch (_e) { return false; }
}

function lru(device) {
  if (!device._dynObs) {device._dynObs = new Map();}
  return device._dynObs;
}

/** Pure-ish: record one observation in the bounded LRU, return the entry. */
function record(device, key, type, value) {
  const m = lru(device);
  let e = m.get(key);
  if (e) { m.delete(key); } else {
    if (m.size >= MAX_KEYS) { m.delete(m.keys().next().value); }
    e = { type: type == null ? typeof value : type, n: 0, min: null, max: null, last: null };
  }
  e.n = Math.min(e.n + 1, 1e6);
  if (typeof value === 'number' && Number.isFinite(value)) {
    e.min = e.min === null ? value : Math.min(e.min, value);
    e.max = e.max === null ? value : Math.max(e.max, value);
  }
  e.last = typeof value === 'object' ? String(JSON.stringify(value)).slice(0, 32) : value;
  m.set(key, e);
  return e;
}

function learned(device) {
  try { const v = device.getStoreValue(STORE_KEY); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (_e) { return {}; }
}

async function enable(device, key, cap, value, why) {
  try {
    if (!ADDITIVE.test(cap) || killed(device) || device._destroyed) {return false;}
    let D = null; try { D = require('./DpCatalogDecoder'); } catch (_e) { D = null; }
    if (D && D._driverOwns && D._driverOwns(device, cap)) {return false;}
    if (!device.hasCapability(cap)) {
      await device.addCapability(cap);
      try { device.log(`[DYN-ADAPT] +${cap} from ${key} (${why})`); } catch (_e) { /* noop */ }
    }
    const l = learned(device);
    if (!l[key] && Object.keys(l).length < MAX_LEARNED) {
      l[key] = { cap, why: String(why).slice(0, 60) };
      try { await device.setStoreValue(STORE_KEY, l); } catch (_e) { /* non-fatal */ }
    }
    if (value !== undefined && value !== null) {
      const set = typeof device.safeSetCapabilityValue === 'function' ? device.safeSetCapabilityValue.bind(device) : device.setCapabilityValue.bind(device);
      await Promise.resolve(set(cap, value)).catch(() => {});
    }
    return true;
  } catch (_e) { return false; }
}

/** Unknown EF00 DP. Returns {cap,why} when enabled, else null. */
async function observeDp(device, dp, raw, datatype) {
  try {
    if (!device || killed(device)) {return null;}
    const key = `dp:${Number(dp)}`;
    const e = record(device, key, datatype, typeof raw === 'number' ? raw : (raw && raw.length !== undefined ? raw.length : raw));
    const D = require('./DpCatalogDecoder');
    const ident = (k) => (typeof device.getSetting === 'function' && device.getSetting(k)) || (typeof device.getStoreValue === 'function' && device.getStoreValue(k)) || null;
    const mfr = ident('zb_manufacturer_name');
    const pid = ident('zb_model_id') || ident('zb_product_id');
    // Tier 1: exact catalogue row for THIS couple (sourced KB), value decodes and is in range.
    const ex = mfr && pid ? D.entry(mfr, pid, dp) : null;
    if (ex && ex.conv && ex.name) {
      const cap = D.NAME_CAP[ex.name];
      const d = D.decode(ex.conv, raw);
      if (cap && d && typeof d.value === 'number' && e.n >= EXACT_CONFIRM_N && D.heuristicAllowed(device, dp, cap)) {
        const ok = await enable(device, key, cap, d.value, `exact ${ex.name}/${ex.conv} x${e.n}`);
        return ok ? { cap, why: 'exact' } : null;
      }
      return null;
    }
    // Tier 2: family inference, already confirmed by real reports on this device.
    const inf = require('./InferredDpLayer').observe(device, dp, raw);
    if (inf && inf.state === 'confirmed' && inf.reason === 'capability-absent') {
      const cap = D.NAME_CAP[inf.name];
      if (cap) {
        const ok = await enable(device, key, cap, inf.value, `inferred ${inf.name}`);
        return ok ? { cap, why: 'inferred' } : null;
      }
    }
    return null;
  } catch (_e) { return null; }
}

/** Unknown ZCL attribute report. Only known read-only measurement clusters are ever enabled. */
async function observeZcl(device, cluster, attr, value) {
  try {
    if (!device || killed(device)) {return null;}
    const cid = typeof cluster === 'number' ? cluster : Number(cluster);
    const key = `zcl:${Number.isFinite(cid) ? cid : String(cluster).slice(0, 24)}.${String(attr).slice(0, 32)}`;
    const e = record(device, key, null, value);
    if (!Number.isFinite(cid)) {return null;}
    const { MEASURE } = require('./DynamicBindingAdapter');
    const m = MEASURE[cid];
    if (!m || m.attr !== attr || typeof value !== 'number' || e.n < ZCL_CONFIRM_N) {return null;}
    const ok = await enable(device, key, m.cap, m.xform(value), `zcl ${cid}.${attr} x${e.n}`);
    return ok ? { cap: m.cap, why: 'zcl' } : null;
  } catch (_e) { return null; }
}

function snapshot(device) {
  const out = {};
  try { for (const [k, v] of lru(device)) {out[k] = { ...v };} } catch (_e) { /* none */ }
  return out;
}

module.exports = { observeDp, observeZcl, record, snapshot, killed, ADDITIVE, MAX_KEYS, MAX_LEARNED, STORE_KEY };
