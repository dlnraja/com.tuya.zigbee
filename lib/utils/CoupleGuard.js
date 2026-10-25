'use strict';

// P3039d / t524u — per-couple runtime guard.
// WHY: Homey pairs on the cartesian manufacturerName x productId of a driver. When a mfr has
// real couples on several drivers, a driver can match a combo no real device reports.
// lib/data/couple-guard.json lists, per driver, the REAL pids of a constrained mfr. At init we
// compare the paired couple (case-insensitive): an unlisted pid for a listed mfr is logged and a
// soft warning asks for a re-pair (Homey cannot move a paired device to another driver). The
// device keeps running; nothing is written to the device, nothing throws.

let RULES = null;
function rules() {
  if (RULES) {return RULES;}
  try {
    RULES = require('../data/couple-guard.json').drivers || {};
  } catch (_e) {
    RULES = {};
  }
  return RULES;
}

/** Pure check. Returns { ok, constrained, expected } for (driverId, mfr, pid). */
function checkCouple(driverId, mfr, pid) {
  const entry = rules()[driverId];
  const m = String(mfr || '').trim().toLowerCase();
  const p = String(pid || '').trim().toLowerCase();
  if (!entry || !entry.mfrs || !m) {return { ok: true, constrained: false };}
  const allowed = entry.mfrs[m];
  if (!Array.isArray(allowed)) {return { ok: true, constrained: false };}
  if (!p) {return { ok: true, constrained: true, expected: allowed };}
  const ok = allowed.some((x) => String(x).toLowerCase() === p);
  return { ok, constrained: true, expected: allowed };
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

/** Device hook: idempotent, never throws. Returns the check result. */
function guard(device) {
  try {
    if (!device || device.__coupleGuardDone) {return { ok: true, constrained: false };}
    device.__coupleGuardDone = true;
    let driverId = '';
    try { driverId = device.driver && device.driver.id; } catch (_e) { /* ignore */ }
    if (!driverId) {return { ok: true, constrained: false };}
    const { mfr, pid } = readCouple(device);
    const r = checkCouple(driverId, mfr, pid);
    if (!r.ok) {
      const msg = `Couple ${mfr}|${pid} is not a known device for this driver (expected ${mfr}|${r.expected.join('/')}). Please remove and re-pair the device.`;
      try { device.log(`[COUPLE-GUARD] ${driverId}: ${msg}`); } catch (_e) { /* ignore */ }
      try {
        const p = device.setWarning && device.setWarning(msg);
        if (p && typeof p.catch === 'function') {p.catch(() => {});}
      } catch (_e) { /* ignore */ }
    }
    return r;
  } catch (_e) {
    return { ok: true, constrained: false };
  }
}

module.exports = { guard, checkCouple, readCouple, _reset: () => { RULES = null; } };
