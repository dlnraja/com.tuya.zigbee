'use strict';

/**
 * P3384 / Tuya Local 154077 #539-#540 (Simon_Salvin, Andi): Mantra ceiling
 * fans (protocol 3.5) have two opt-in quirks:
 *  1. Courtesy light: when the fan turns off it turns its own light on
 *     during braking. If the user did not turn the light on, send light
 *     off at 150 ms and 500 ms, and override late on-reports for 30 s.
 *  2. Remember direction while the fan is off; send it together with
 *     power on so a Summer/Winter change is not lost.
 *
 * All behaviours are opt-in. Speed may be a numeric string ("1"-"32").
 * Direction may be a boolean (true = reverse / winter).
 */

const LIGHT_OFF_PULSES_MS = Object.freeze([150, 500]);
const LIGHT_OVERRIDE_MS = 30000;
const LIGHT_OVERRIDE_TICK_MS = 2000;

function coerceSpeed(value, options) {
  const opts = options || {};
  if (opts.asText === true) {
    if (value == null) {return null;}
    return String(value);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function coerceDirection(value) {
  if (value === true || value === 'true' || value === 'reverse' || value === 'winter' || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 'false' || value === 'forward' || value === 'summer' || value === 0 || value === '0') {
    return false;
  }
  return null;
}

function planFanOff(state, options) {
  const opts = options || {};
  const st = state && typeof state === 'object' ? { ...state } : {};
  const now = opts.now == null ? Date.now() : Number(opts.now);
  const lightUserOn = st.lightUserOn === true;
  const rememberDirection = opts.rememberDirection === true;
  const keepLightOff = opts.keepLightOff === true && !lightUserOn;
  const actions = [];
  if (keepLightOff) {
    for (const at of LIGHT_OFF_PULSES_MS) {actions.push({ type: 'light-off', atMs: at });}
    st.lightOverrideUntil = now + LIGHT_OVERRIDE_MS;
  } else {
    st.lightOverrideUntil = 0;
  }
  if (rememberDirection && st.pendingDirection != null) {
    st.heldDirection = st.pendingDirection;
  }
  st.fanOn = false;
  return { state: st, actions };
}

function planFanOn(state, options) {
  const opts = options || {};
  const st = state && typeof state === 'object' ? { ...state } : {};
  const dps = {};
  dps[String(opts.fanDp == null ? 1 : opts.fanDp)] = true;
  if (opts.rememberDirection === true) {
    const dir = st.pendingDirection != null ? st.pendingDirection : st.heldDirection;
    if (dir != null) {
      dps[String(opts.directionDp == null ? 101 : opts.directionDp)] = !!dir;
    }
  }
  st.fanOn = true;
  st.lightOverrideUntil = 0;
  return { state: st, dps };
}

function shouldOverrideLightOn(state, now) {
  const until = state && Number(state.lightOverrideUntil || 0);
  if (!until) {return false;}
  const ts = now == null ? Date.now() : Number(now);
  return ts < until && state.lightUserOn !== true;
}

function markUserLight(state, on) {
  const st = state && typeof state === 'object' ? { ...state } : {};
  st.lightUserOn = !!on;
  if (on) {st.lightOverrideUntil = 0;}
  return st;
}

module.exports = {
  LIGHT_OFF_PULSES_MS,
  LIGHT_OVERRIDE_MS,
  LIGHT_OVERRIDE_TICK_MS,
  coerceSpeed,
  coerceDirection,
  planFanOff,
  planFanOn,
  shouldOverrideLightOn,
  markUserLight,
};
