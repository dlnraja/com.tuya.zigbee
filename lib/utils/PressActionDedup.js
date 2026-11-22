'use strict';

/**
 * P3362 / t1008u - time-window dedup per endpoint+action for Tuya TS0044
 * scene remotes such as _TZ3000_wkai4ga5 (model TS0044, 4 endpoints,
 * inputClusters [1,6] / ep1 [0,1,6]).
 *
 * Credit: Johan Bendz (JohanBendz/com.tuya.zigbee v0.2.71-v0.2.73,
 * 2024-10-12, issues #864 and #793) and reporters RBouroubi, roxart, SunBeech.
 * Lesson only - never post on Johan's repo or topic 26439.
 *
 * Mechanism: one physical press emits two cluster-6 frames (a standard
 * onOff commandOn/Off/Toggle and/or the Tuya manufacturer command 0xFD,
 * payload 0=single, 1=double, 2=hold). Johan's fix kept the first frame
 * in a short window and parsed frame[3] as the action. Dedup MUST key on
 * the normalized action, not the transport path, or both paths fire a Flow
 * card. Listeners must be registered once (re-init / migration used to
 * double-bind). Long press is about 5 s on this MOES model; long-press
 * release is forwarded only when the device sends it (never invented).
 */

const { resolve } = require('./TuyaPressTypeMap');

const DEFAULT_WINDOW_MS = 400;

function normalizeAction(pressType) {
  const resolved = resolve(pressType);
  const r = (resolved && typeof resolved === 'object' ? resolved.press || resolved.type || resolved.action : resolved)
    || String(pressType == null ? 'single' : pressType).toLowerCase();
  const s = String(r).toLowerCase();
  if (s === 'release' || s === 'long_release' || s === 'released' || s === 'stop') {return 'release';}
  if (s === 'long' || s === 'hold' || s === 'long_press' || s === 'held') {return 'long';}
  if (s === 'double' || s === 'double_press') {return 'double';}
  if (s === 'multi' || s === 'triple') {return 'multi';}
  return 'single';
}

function shouldDrop(store, endpoint, action, now, windowMs) {
  const key = `${Number(endpoint) || 0}|${normalizeAction(action)}`;
  const win = windowMs == null ? DEFAULT_WINDOW_MS : Number(windowMs);
  const ts = now == null ? Date.now() : Number(now);
  const prev = store[key] || 0;
  if (ts - prev < win) {return { drop: true, key };}
  store[key] = ts;
  return { drop: false, key };
}

function installOnce(obj, flag) {
  if (!obj || obj[flag]) {return false;}
  obj[flag] = true;
  return true;
}

module.exports = { DEFAULT_WINDOW_MS, normalizeAction, shouldDrop, installOnce };
