'use strict';
/**
 * P2950 — Power strip paired as a single plug (only DP1 driven).
 * Credit: Homey forum topic 154077 post #526 (id 790454) by Stijn_Van_Heeswijk,
 * https://community.homey.app/t/154077/526 — strip shows one outlet, DP2/DP3 unused.
 * Our own approach, informed by the switch_N layout used by tuya-local (make-all)
 * and localtuya (rospogrigio / xZetsubou) multi-switch configs: outlets are booleans
 * on DP1..DP6, an optional USB/master switch on DP7, timers/countdowns on DP9..DP15.
 * Pure function: feed it the merged dps from TuyaDpDetector probing; it returns a plan.
 * Fallback: anything ambiguous keeps the existing single-plug behaviour.
 */
const OUTLET_RANGE = [1, 6];
const USB_DP = 7;
const COUNTDOWN_RANGE = [9, 15];

function isBool(v) { return typeof v === 'boolean'; }

/**
 * @param {object} dps merged {dpId: value} map (keys may be strings)
 * @returns {{ mode: 'single'|'multi', sockets: Array<{dp:number,kind:'outlet'|'usb',countdownDp:number|null}>, reason: string }}
 */
function inferSockets(dps) {
  const map = dps && typeof dps === 'object' ? dps : {};
  const ids = Object.keys(map).map(Number).filter(Number.isInteger);
  const has = (id) => Object.prototype.hasOwnProperty.call(map, String(id));
  const outlets = [];
  for (let id = OUTLET_RANGE[0]; id <= OUTLET_RANGE[1]; id++) {
    if (has(id) && isBool(map[String(id)])) {outlets.push(id);} else {break;} // contiguous only
  }
  if (outlets.length < 2) {
    return { mode: 'single', sockets: outlets.length ? [{ dp: 1, kind: 'outlet', countdownDp: null }] : [], reason: 'fewer than two contiguous boolean outlet DPs' };
  }
  const countdowns = ids.filter((i) => i >= COUNTDOWN_RANGE[0] && i <= COUNTDOWN_RANGE[1] && typeof map[String(i)] === 'number').sort((a, b) => a - b);
  const sockets = outlets.map((dp) => {
    const cd = COUNTDOWN_RANGE[0] + (dp - 1);
    return { dp, kind: 'outlet', countdownDp: countdowns.includes(cd) ? cd : null };
  });
  if (has(USB_DP) && isBool(map[String(USB_DP)])) {sockets.push({ dp: USB_DP, kind: 'usb', countdownDp: null });}
  return { mode: 'multi', sockets, reason: `${outlets.length} contiguous boolean outlet DPs` };
}

/** Sub-socket descriptors (additive; caller decides whether to create devices). */
function subSocketPlan(parentId, dps) {
  const r = inferSockets(dps);
  if (r.mode !== 'multi') {return [];}
  return r.sockets.map((s, i) => ({
    id: `${parentId}:${s.dp}`, parentId, dp: s.dp, kind: s.kind,
    name: s.kind === 'usb' ? 'USB' : `Socket ${i + 1}`, countdownDp: s.countdownDp,
  }));
}

module.exports = { inferSockets, subSocketPlan, OUTLET_RANGE, USB_DP };
