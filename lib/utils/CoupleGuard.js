'use strict';

// P3039d / t524u — per-couple runtime guard.
// WHY: Homey pairs on the cartesian manufacturerName x productId of a driver. When a mfr has
// real couples on several drivers, a driver can match a combo no real device reports.
// lib/data/couple-guard.json lists, per driver, the REAL pids of a constrained mfr. At init we
// compare the paired couple (case-insensitive).
//
// P3040 (t525u) extension — never depend on a re-pair:
//  1. Name the EXACT driver: couple-guard.json (another driver lists this mfr with this pid) and
//     config/architecture/couple-driver-pins.json (verified couple pinned to one driver).
//  2. Make the device work as well as possible on the CURRENT driver: the common DPs keep flowing
//     through the current driver; when the right driver is known, its profile is overlaid through
//     IntelligentDriverHotSwap.applyDriverProfile (additive only: guarded capability adds, budgeted,
//     persisted and restored on restart). Never setUnavailable, nothing written to the device.
//  3. Report ONCE (one warning + one timeline notification, remembered in the store), then stay
//     silent on later starts (log line only).

const STORE_NOTIFIED = 'couple_guard_notified';
const STORE_EXPECTED = 'expected_driver';
const PROFILE_DELAY_MS = 30000;
const PROFILE_CONFIDENCE = 0.9;

let RULES = null;
let PINS = null;
function rules() {
  if (RULES) {return RULES;}
  try {
    RULES = require('../data/couple-guard.json').drivers || {};
  } catch (_e) {
    RULES = {};
  }
  return RULES;
}

const norm = (v) => String(v || '').trim().toLowerCase();

/** Map "mfr|pid" (lowercase) -> pinned driver, from the verified couple pins (bounded by the file). */
function pins() {
  if (PINS) {return PINS;}
  PINS = new Map();
  try {
    const list = require('../../config/architecture/couple-driver-pins.json').pins || [];
    for (const p of list) {
      if (!p || !p.driver) {continue;}
      const mfrs = Array.isArray(p.mfr) ? p.mfr : [p.mfr];
      const pids = Array.isArray(p.pid) ? p.pid : [p.pid];
      const keys = mfrs.flatMap((m) => pids.map((q) => m && q ? `${norm(m)}|${norm(q)}` : null));
      keys.filter(Boolean).forEach((k) => PINS.set(k, p.driver));
    }
  } catch (_e) { /* optional source */ }
  return PINS;
}

/** Pure check. Returns { ok, constrained, expected } for (driverId, mfr, pid). */
function checkCouple(driverId, mfr, pid) {
  const entry = rules()[driverId];
  const m = norm(mfr);
  const p = norm(pid);
  if (!entry || !entry.mfrs || !m) {return { ok: true, constrained: false };}
  const allowed = entry.mfrs[m];
  if (!Array.isArray(allowed)) {return { ok: true, constrained: false };}
  if (!p) {return { ok: true, constrained: true, expected: allowed };}
  const ok = allowed.some((x) => norm(x) === p);
  return { ok, constrained: true, expected: allowed };
}

/** Exact driver for the couple, other than driverId, or null. Pins win (verified), then couple-guard. */
function expectedDriver(driverId, mfr, pid) {
  const m = norm(mfr);
  const p = norm(pid);
  if (!m || !p) {return null;}
  const pinned = pins().get(`${m}|${p}`);
  if (pinned) {return pinned === driverId ? null : pinned;}
  for (const [id, entry] of Object.entries(rules())) {
    if (id === driverId || !entry || !entry.mfrs) {continue;}
    const allowed = entry.mfrs[m];
    if (Array.isArray(allowed) && allowed.some((x) => norm(x) === p)) {return id;}
  }
  return null;
}

function readCouple(device) {
  const get = (k) => {
    try { return device.getSetting && device.getSetting(k); } catch (_e) { return undefined; }
  };
  let data = {};
  try { data = (device.getData && device.getData()) || {}; } catch (_e) { /* ignore */ }
  let store = {};
  try { store = (device.getStore && device.getStore()) || {}; } catch (_e) { /* ignore */ }
  const mfr = get('zb_manufacturer_name') || store.manufacturerName || data.manufacturerName || '';
  const pid = get('zb_product_id') || get('zb_model_id') || store.modelId || store.productId || data.productId || '';
  return { mfr, pid };
}

function quiet(p) { if (p && typeof p.catch === 'function') {p.catch(() => {});} }

function storeGet(device, k) {
  try { return device.getStoreValue ? device.getStoreValue(k) : undefined; } catch (_e) { return undefined; }
}

function buildMessage(driverId, mfr, pid, target, expected) {
  if (target) {
    return `${mfr}|${pid} is a "${target}" device (paired as "${driverId}"). It keeps working here with the common functions, plus the "${target}" profile when one is available; no action is required.`;
  }
  return `${mfr}|${pid} is not a known couple for "${driverId}" (known: ${mfr}|${(expected || []).join('/')}). It keeps working with the common functions; no action is required.`;
}

/** Best effort on the current driver: overlay the right driver's profile once hotSwap is up. */
function adaptOnCurrentDriver(device, target) {
  if (!target || device.__coupleGuardAdaptScheduled) {return;}
  device.__coupleGuardAdaptScheduled = true;
  const run = () => {
    try {
      if (device._destroyed || typeof device.hotSwapProfile !== 'function') {return;}
      if (!device.hotSwap) {return;} // dynamic layers off / not booted: common DPs only
      quiet(device.hotSwapProfile(target, PROFILE_CONFIDENCE));
    } catch (_e) { /* best effort */ }
  };
  try {
    // homey.setTimeout so the timer is cleared with the device; skipped when there is no homey (tests)
    if (device.homey && typeof device.homey.setTimeout === 'function') {device.homey.setTimeout(run, PROFILE_DELAY_MS);}
  } catch (_e) { /* ignore */ }
}

function tryCall(fn) { try { quiet(fn()); } catch (_e) { /* ignore */ } }

/** One timeline notification (best effort). */
function notify(device, msg) {
  const n = device.homey && device.homey.notifications;
  if (!n || typeof n.createNotification !== 'function') {return;}
  let name = '';
  try { name = (device.getName && device.getName()) || ''; } catch (_e) { /* ignore */ }
  tryCall(() => n.createNotification({ excerpt: `${name ? `${name}: ` : ''}${msg}` }));
}

/**
 * Report once per couple+target, then stay silent. Synchronous (SDK3 getStoreValue is sync), never throws.
 * c = { driverId, mfr, pid, target, expected }
 */
function reportOnce(device, c) {
  const msg = buildMessage(c.driverId, c.mfr, c.pid, c.target, c.expected);
  const key = `${norm(c.mfr)}|${norm(c.pid)}>${c.target || '?'}`;
  const log = (t) => { try { device.log(`[COUPLE-GUARD] ${c.driverId}: ${t}`); } catch (_e) { /* ignore */ } };
  if (storeGet(device, STORE_NOTIFIED) === key) {
    log(`${c.mfr}|${c.pid} -> ${c.target || 'unknown'} (already reported, silent)`);
    return false;
  }
  log(msg);
  tryCall(() => device.setWarning && device.setWarning(msg));
  notify(device, msg);
  tryCall(() => device.setStoreValue && device.setStoreValue(STORE_NOTIFIED, key));
  tryCall(() => device.setStoreValue && device.setStoreValue(STORE_EXPECTED, c.target || null));
  return true;
}

/** Device hook: idempotent, never throws. Returns the check result (+ target when known). */
function guard(device) {
  try {
    if (!device || device.__coupleGuardDone) {return { ok: true, constrained: false };}
    device.__coupleGuardDone = true;
    let driverId = '';
    try { driverId = device.driver && device.driver.id; } catch (_e) { /* ignore */ }
    if (!driverId) {return { ok: true, constrained: false };}
    const { mfr, pid } = readCouple(device);
    const r = checkCouple(driverId, mfr, pid);
    // A verified pin elsewhere also counts as a mismatch, even for an unconstrained mfr.
    const target = expectedDriver(driverId, mfr, pid);
    const mismatch = !r.ok || (target && !(r.constrained && r.ok));
    if (!mismatch) {return r;}
    const out = { ...r, ok: false, target: target || null };
    adaptOnCurrentDriver(device, target);
    reportOnce(device, { driverId, mfr, pid, target, expected: r.expected });
    return out;
  } catch (_e) {
    return { ok: true, constrained: false };
  }
}

module.exports = {
  guard, checkCouple, readCouple, expectedDriver, buildMessage, reportOnce,
  _reset: () => { RULES = null; PINS = null; },
};
