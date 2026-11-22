'use strict';

/**
 * P3384 / forum 156967 #99-#141 (SunBeech, SergeP): some scene remotes fire
 * two single-press events about 1 s apart, often on the first press after a
 * Homey or app restart. Compatible with the TS0044 action-keyed short window
 * in PressActionDedup (P3362 / Johan #864, ~400 ms): that helper is used when
 * present, then this module adds a longer same-action single debounce only
 * inside a bounded post-restart window.
 *
 * Never drop a typed 'double' / 'long' / 'multi' report. Two real singles
 * after the post-restart window are left alone.
 */

const POST_RESTART_MS = 120000;
const SINGLE_WINDOW_MS = 1500;

function loadPressActionDedup() {
  try {
    const fs = require('fs');
    const path = require('path');
    const abs = path.join(__dirname, 'PressActionDedup.js');
    if (!fs.existsSync(abs)) {return null;}
    return require(abs);
  } catch (_e) {return null;}
}

function normalizeAction(action) {
  const pad = loadPressActionDedup();
  if (pad && typeof pad.normalizeAction === 'function') {return pad.normalizeAction(action);}
  const s = String(action == null ? 'single' : action).toLowerCase();
  if (s === 'release' || s === 'long_release' || s === 'released' || s === 'stop') {return 'release';}
  if (s === 'long' || s === 'hold' || s === 'long_press' || s === 'held') {return 'long';}
  if (s === 'double' || s === 'double_press') {return 'double';}
  if (s === 'multi' || s === 'triple') {return 'multi';}
  return 'single';
}

function markStart(state, now) {
  const st = state && typeof state === 'object' ? state : {};
  if (!st.startedAt) {st.startedAt = now == null ? Date.now() : Number(now);}
  if (!st.store) {st.store = {};}
  return st;
}

function inPostRestartWindow(state, now) {
  const st = state || {};
  const ts = now == null ? Date.now() : Number(now);
  const started = Number(st.startedAt || 0);
  if (!started) {return false;}
  return ts - started >= 0 && ts - started < POST_RESTART_MS;
}

/**
 * @returns {{ drop: boolean, key: string, reason: string }}
 */
function shouldDrop(state, endpoint, action, now, options) {
  const st = markStart(state, now);
  const ts = now == null ? Date.now() : Number(now);
  const act = normalizeAction(action);
  const key = `${Number(endpoint) || 0}|${act}`;

  // Short transport-keyed window from PressActionDedup when the module exists.
  const pad = loadPressActionDedup();
  if (pad && typeof pad.shouldDrop === 'function') {
    const short = pad.shouldDrop(st.store, endpoint, action, ts, options && options.shortWindowMs);
    if (short && short.drop) {return { drop: true, key: short.key || key, reason: 'short-window' };}
  }

  // Longer same-action single debounce only after restart, never for double/long.
  if (act !== 'single') {return { drop: false, key, reason: 'typed-action' };}
  if (!inPostRestartWindow(st, ts)) {return { drop: false, key, reason: 'outside-window' };}
  const win = options && options.singleWindowMs != null ? Number(options.singleWindowMs) : SINGLE_WINDOW_MS;
  const prev = st.store[`post|${key}`] || 0;
  if (prev && ts - prev < win) {return { drop: true, key, reason: 'post-restart-single' };}
  st.store[`post|${key}`] = ts;
  return { drop: false, key, reason: 'accepted' };
}

module.exports = {
  POST_RESTART_MS,
  SINGLE_WINDOW_MS,
  normalizeAction,
  markStart,
  inPostRestartWindow,
  shouldDrop,
};
