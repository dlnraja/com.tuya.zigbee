'use strict';
/**
 * P-KB3 profile layer — wires the declarative profile engine into TuyaZigbeeDevice as an OPTIONAL, ADDITIVE layer.
 * Called AFTER native setup (native clusters stay the pairing base). Rules:
 *  - fill-only: a profile DP value is written only to a capability the device ALREADY has;
 *    the layer never adds nor removes a capability (a thinner interview can never drop one);
 *  - a DP already handled by the driver's own dpMappings is left to the driver;
 *  - Z2M-style options (debounce/throttle/filtered/optimistic) only when the user sets them;
 *  - runtime quirks (extra reporting) bounded and best-effort.
 * Kill switches: device setting `profile_engine` === false, app setting `profile_engine_off` === true,
 * env PROFILE_ENGINE_OFF=1.
 */
const PE = require('./ProfileEngine');
const { ReportOptions } = require('./options');
const T = require('./transforms');
const MAX_QUIRK_REPORTS = 8;

function _set(device, key) { try { return device.getSetting?.(key); } catch { return undefined; } }
function enabled(device) {
  if (!PE.enabled(device && device.homey)) {return false;}
  return _set(device, 'profile_engine') !== false;
}
function optionsFor(device) {
  const n = (k) => { const v = Number(_set(device, k)); return Number.isFinite(v) && v > 0 ? Math.min(v, 600000) : 0; };
  const f = String(_set(device, 'pe_filtered_attributes') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return { debounceMs: n('pe_debounce_ms'), throttleMs: n('pe_throttle_ms'), filtered: f, optimistic: _set(device, 'pe_optimistic') === true };
}
function _identity(device) {
  let mfr = null, pid = null;
  try { const d = device.getData?.() || {}; mfr = d.manufacturerName || null; pid = d.productId || null; } catch { /* soft */ }
  try { mfr = mfr || device.getSetting?.('zb_manufacturer_name') || device.zclNode?.endpoints?.[1]?.clusters?.basic?.manufacturerName || null; } catch { /* soft */ }
  try { pid = pid || device.getSetting?.('zb_model_id') || device.getSetting?.('zb_product_id') || null; } catch { /* soft */ }
  return { mfr, pid };
}
function _driverHandles(device, dp) {
  const m = device.dpMappings || device._dpMappings || (device.constructor && device.constructor.dpMappings);
  return !!(m && typeof m === 'object' && Object.prototype.hasOwnProperty.call(m, String(dp)));
}
/** Pure: which capability updates the layer may emit for one DP report. */
function plan(device, prof, dp, value, ctx = {}) {
  if (_driverHandles(device, dp)) {return [];}
  return PE.decode(prof, dp, value, ctx).filter((u) => u.cap && u.value !== undefined && u.value !== null
    && typeof device.hasCapability === 'function' && device.hasCapability(u.cap))
    .map((u) => { const cal = Number(_set(device, `${u.cap}_calibration`));
      return Number.isFinite(cal) && cal !== 0 && typeof u.value === 'number' ? { ...u, value: T.calibrate(u.value, { offset: cal }) } : u; });
}
async function _quirks(device, prof, zclNode) {
  const q = (prof.quirks || {}).reporting || [];
  for (const r of q.slice(0, MAX_QUIRK_REPORTS)) {
    try { const c = zclNode?.endpoints?.[r.endpoint || 1]?.clusters?.[r.cluster];
      if (c && typeof c.configureReporting === 'function') {await c.configureReporting({ [r.attr]: { minInterval: r.min ?? 1, maxInterval: r.max ?? 3600, minChange: r.change ?? 1 } });}
    } catch { /* best effort */ }
  }
}
async function attach(device, zclNode) {
  if (!device || device.__pe) {return null;}
  if (!enabled(device)) {return null;}
  try { await require('./groups').applyGroups(device, zclNode || device.zclNode); } catch { /* opt-in, soft */ }
  const { mfr, pid } = _identity(device); if (!mfr || !pid) {return null;}
  const prof = PE.find(mfr, pid); if (!prof) {return null;}
  const opts = new ReportOptions(optionsFor(device));
  const st = { prof, opts, mfr, pid, handled: 0, listener: null };
  device.__pe = st;
  const mgr = device.tuyaEF00Manager;
  if (mgr && typeof mgr.on === 'function') {
    st.listener = (evt) => { try {
      const ups = plan(device, prof, evt && evt.dp, evt && evt.value, { mfr, appVersion: _set(device, 'zb_app_version') });
      for (const u of ups) {opts.push(u.cap, u.value, (cap, v) => { st.handled++; Promise.resolve(device.setCapabilityValue(cap, v)).catch(() => {}); });}
    } catch { /* soft */ } };
    mgr.on('datapoint', st.listener);
  }
  await _quirks(device, prof, zclNode).catch(() => {});
  try { device.log?.(`[PROFILE] ${prof.id} attached (${mfr}/${pid})`); } catch { /* soft */ }
  return st;
}
function detach(device) {
  const st = device && device.__pe; if (!st) {return;}
  try { if (st.listener) {device.tuyaEF00Manager?.removeListener?.('datapoint', st.listener);} } catch { /* soft */ }
  try { st.opts.destroy(); } catch { /* soft */ }
  device.__pe = null;
}
module.exports = { attach, detach, enabled, optionsFor, plan };
