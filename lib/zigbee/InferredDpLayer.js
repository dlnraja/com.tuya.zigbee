'use strict';

/**
 * P3018b: OPTIONAL low-confidence "inferred" Tuya DP layer (master only).
 *
 * Data: lib/zigbee/data/inferred-dp-family.json (scripts/data/build-inferred-dp-family.js), built
 * from EXACT catalogue rows of other couples of the same family:
 *   'PID|driver' (same productId + driver) → '*|driver' (same driver) → 'n:name' (same DP id + name).
 *
 * Rules (WHY: a family guess is NOT a fact — a wrong scale on a wrong DP is worse than a generic value):
 *  - used only when the couple has NO exact converter for the DP (exact always wins);
 *  - when the catalogue names the DP, the candidate must mean the same thing (cross-check);
 *  - every report is decoded + range/type-checked; per device we remember what real reports say
 *    (store `inferred_dp_confirm`, ≤ 32 DPs): 3 valid reports → confirmed; ONE invalid → rejected
 *    for that device for good (until the candidate itself changes after a data update);
 *  - a capability is written only when confirmed, the capability already exists, the driver does
 *    not own the capability or the DP, the heuristic veto allows it and no other DP owns it;
 *  - never sends anything (zero TX), never adds capabilities.
 */

const D = require('./DpCatalogDecoder');

const STORE_KEY = 'inferred_dp_confirm';
const CONFIRM_N = 3;
const MAX_DPS = 32;

let _data = null;
function _fam() {
  if (_data === null) { try { _data = require('./data/inferred-dp-family.json'); } catch (_e) { _data = false; } }
  return _data || null;
}

function _ident(device) {
  const s = (k) => (typeof device.getSetting === 'function' ? device.getSetting(k) : null) || (typeof device.getStoreValue === 'function' ? device.getStoreValue(k) : null);
  let drv = null;
  try { drv = (device.driver && (device.driver.id || (device.driver.manifest && device.driver.manifest.id))) || null; } catch (_e) { drv = null; }
  return { mfr: s('zb_manufacturer_name'), pid: String(s('zb_model_id') || s('zb_product_id') || '').toUpperCase(), drv };
}

function _row(fk, dp) {
  const f = _fam();
  const r = f && f.fam && f.fam[fk];
  if (!r) { return null; }
  for (let i = 0; i < r.length; i += 5) {
    if (r[i] === Number(dp)) { return { name: f.names[r[i + 1]], conv: f.convs[r[i + 2]], support: r[i + 3], total: r[i + 4] }; }
  }
  return null;
}

const _meaning = (n) => D.NAME_CAP[n] || D.VETO_CAP[n] || n;

/** Inferred candidate for this device's DP, or null (exact decoder exists / no family evidence). */
function candidate(device, dp) {
  try {
    if (!device) { return null; }
    const { mfr, pid, drv } = _ident(device);
    const e = mfr && pid ? D.entry(mfr, pid, dp) : null;
    if (e && e.conv) { return null; } // WHY: exact converter for this couple — never overridden
    const tiers = [];
    if (drv && pid) { tiers.push([`${pid}|${drv}`, 'pid']); }
    if (drv) { tiers.push([`*|${drv}`, 'category']); }
    if (e && e.name) { tiers.push([`n:${e.name}`, 'name']); }
    for (const [fk, tier] of tiers) {
      const r = _row(fk, dp);
      if (!r) { continue; }
      if (e && e.name && _meaning(e.name) !== _meaning(r.name)) { continue; } // cross-check vs source name
      return { ...r, tier, label: 'inferred' };
    }
  } catch (_e) { /* optional layer */ }
  return null;
}

function _capOf(name) {
  return D.NAME_CAP[name] || (/^(measure_(?!battery)|alarm_(?!battery)|meter_)[a-z0-9_.]+$/.test(name || '') ? name : null);
}

function _valid(cap, v) {
  if (!cap) { return v !== null && v !== undefined && (typeof v !== 'number' || Number.isFinite(v)); }
  if (cap.startsWith('alarm_')) { return typeof v === 'boolean'; }
  if (typeof v !== 'number' || !Number.isFinite(v)) { return false; }
  const r = D.RANGE[cap];
  return !r || (v >= r[0] && v <= r[1]);
}

function _mem(device) {
  if (device._inferredDp instanceof Map) { return device._inferredDp; }
  const m = new Map();
  try {
    const saved = typeof device.getStoreValue === 'function' ? device.getStoreValue(STORE_KEY) : null;
    if (saved && typeof saved === 'object') {
      for (const [dp, st] of Object.entries(saved).slice(0, MAX_DPS)) { if (st && typeof st === 'object') { m.set(Number(dp), { k: String(st.k || ''), ok: Number(st.ok) || 0, bad: Number(st.bad) || 0, st: st.st === 'c' || st.st === 'r' ? st.st : 'p' }); } }
    }
  } catch (_e) { /* fresh */ }
  device._inferredDp = m;
  return m;
}

function _persist(device, m) {
  try {
    if (typeof device.setStoreValue !== 'function') { return; }
    const p = device.setStoreValue(STORE_KEY, Object.fromEntries(m));
    if (p && typeof p.catch === 'function') { p.catch(() => {}); }
  } catch (_e) { /* best effort */ }
}

function _allowed(device, dp, cap) {
  if (typeof device.hasCapability !== 'function' || !device.hasCapability(cap)) { return 'capability-absent'; }
  if (D._driverOwns && D._driverOwns(device, cap)) { return 'driver-owns-capability'; }
  if (D._customHandles(device, dp)) { return 'driver-handles-dp'; }
  if (!D.heuristicAllowed(device, dp, cap)) { return 'catalogue-veto'; }
  const owners = device._dpCatOwner || (device._dpCatOwner = new Map());
  if (owners.has(cap) && owners.get(cap) !== Number(dp)) { return 'capability-owned-by-other-dp'; }
  return null;
}

/**
 * Record one real report against the inferred candidate.
 * → null (no candidate) | { label:'inferred', name, conv, tier, value, state:'pending'|'confirmed'|'rejected', capability|null, reason }
 */
function observe(device, dp, raw) {
  const c = candidate(device, dp);
  if (!c) { return null; }
  try {
    const cap = _capOf(c.name);
    const d = D.decode(c.conv, raw);
    let v = d ? d.value : null;
    if (cap && cap.startsWith('alarm_') && typeof v === 'number' && (v === 0 || v === 1)) { v = v === 1; }
    if (typeof v === 'number') { v = Math.round(v * 1000) / 1000; }
    const ok = d !== null && _valid(cap, v);
    const m = _mem(device);
    const key = `${c.name}=${c.conv}`;
    let st = m.get(Number(dp));
    if (!st || st.k !== key) {
      if (!st && m.size >= MAX_DPS) { return { label: 'inferred', name: c.name, conv: c.conv, tier: c.tier, value: v, state: 'pending', capability: null, reason: 'memory-full' }; }
      st = { k: key, ok: 0, bad: 0, st: 'p' };
      m.set(Number(dp), st);
    }
    const before = st.st;
    // WHY: one report can reach both the EF00 manager and the device handler — count it once.
    const seen = device._inferredDpSeen || (device._inferredDpSeen = new Map());
    const now = Date.now();
    const sig = `${typeof raw === 'object' ? JSON.stringify(raw) : raw}`.slice(0, 64);
    const last = seen.get(Number(dp));
    const dup = !!last && last.sig === sig && now - last.t < 1500;
    if (seen.size < MAX_DPS || seen.has(Number(dp))) { seen.set(Number(dp), { sig, t: now }); }
    if (st.st !== 'r' && !dup) {
      if (ok) { st.ok = Math.min(st.ok + 1, 1000); } else { st.bad++; st.st = 'r'; }
      if (st.st === 'p' && st.ok >= CONFIRM_N && st.bad === 0) { st.st = 'c'; }
    }
    if (st.st !== before) { _persist(device, m); }
    const state = st.st === 'c' ? 'confirmed' : st.st === 'r' ? 'rejected' : 'pending';
    const base = { label: 'inferred', name: c.name, conv: c.conv, tier: c.tier, support: c.support, total: c.total, value: v, state, capability: null };
    if (state !== 'confirmed') { return { ...base, reason: state === 'rejected' ? 'rejected-by-reports' : `pending ${st.ok}/${CONFIRM_N}` }; }
    if (!cap) { return { ...base, reason: 'name-not-auto-applied' }; }
    const why = _allowed(device, dp, cap);
    if (why) { return { ...base, reason: why }; }
    const owners = device._dpCatOwner || (device._dpCatOwner = new Map());
    if (!owners.has(cap) && owners.size < 32) { owners.set(cap, Number(dp)); }
    return { ...base, capability: cap, source: `inferred:${c.tier} ${c.name} (${c.conv}) ${c.support}/${c.total} couples, confirmed by ${st.ok} reports` };
  } catch (_e) { return null; }
}

function _resetForTests() { _data = null; }

module.exports = { candidate, observe, STORE_KEY, CONFIRM_N, MAX_DPS, _resetForTests };
