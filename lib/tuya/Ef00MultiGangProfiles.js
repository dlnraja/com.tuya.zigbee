'use strict';

/**
 * P2485 — EF00 multi-gang profile heuristics (Z2M-locked couples).
 * WHY: one TS0601 mfr family = 3-gang vs 4-gang + different backlight DPs.
 * Never invent pid — resolve by manufacturerName only after compose already matched.
 */

const INDICATOR = { off: 0, on_off_status: 1, switch_position: 2 };
const POWER_ON = { off: 0, on: 1, memory: 2, previous: 2 };
const COLOR = {
  red: 0, blue: 1, green: 2, white: 3, yellow: 4,
  magenta: 5, cyan: 6, warm_white: 7, warm_yellow: 8,
};

/** Z2M TS0601_4gang_7ytnacie / hewlydpz colored backlight */
const PROFILE_COLORED_4 = {
  id: 'colored_4gang',
  gangs: 4,
  dps: {
    state_l1: 1, state_l2: 2, state_l3: 3, state_l4: 4,
    countdown_l1: 7, countdown_l2: 8, countdown_l3: 9, countdown_l4: 10,
    master: 13,
    power_on: 14,
    indicator: 15,
    backlight_switch: 16,
    child_lock: 101,
    backlight_pct: 102,
    on_color: 103,
    off_color: 104,
  },
};

/** Z2M TS0601_3gang_rkbxtclc */
const PROFILE_COLORED_3 = {
  id: 'colored_3gang',
  gangs: 3,
  dps: {
    state_l1: 1, state_l2: 2, state_l3: 3,
    countdown_l1: 7, countdown_l2: 8, countdown_l3: 9,
    master: 13,
    power_on: 14,
    indicator: 15,
    backlight_switch: 16,
    child_lock: 101,
    backlight_pct: 102,
    on_color: 103,
    off_color: 104,
  },
};

/** Z2M TS0601_switch_4_gang_2 Homeetec — simple backlight bool on DP7 */
const PROFILE_SIMPLE_4 = {
  id: 'simple_4gang_backlight7',
  gangs: 4,
  dps: {
    state_l1: 1, state_l2: 2, state_l3: 3, state_l4: 4,
    backlight_switch: 7,
  },
};

/** Default V2 multi-switch (countdown 7–10, power-on 14, backlight 16) */
const PROFILE_V2_4 = {
  id: 'v2_multigang_4',
  gangs: 4,
  dps: {
    state_l1: 1, state_l2: 2, state_l3: 3, state_l4: 4,
    countdown_l1: 7, countdown_l2: 8, countdown_l3: 9, countdown_l4: 10,
    master: 13,
    power_on: 14,
    indicator: 15,
    backlight_switch: 16,
  },
};

const BY_MFR = {
  _tze204_7ytnacie: PROFILE_COLORED_4,
  _tze204_hewlydpz: PROFILE_COLORED_4,
  _tze200_hewlydpz: PROFILE_SIMPLE_4,
  _tze204_rkbxtclc: PROFILE_COLORED_3,
  _tze200_shkxsgis: PROFILE_V2_4,
  _tze204_shkxsgis: PROFILE_V2_4,
  _tze284_shkxsgis: PROFILE_V2_4,
  _tze204_aagrxlbd: PROFILE_V2_4,
  _tze284_aagrxlbd: PROFILE_V2_4,
};

function normalizeMfr(mfr) {
  return String(mfr || '').trim().toLowerCase();
}

/**
 * @param {string} manufacturerName
 * @param {{ gangs?: number }} [hint]
 */
function resolveEf00MultiGangProfile(manufacturerName, hint = {}) {
  const key = normalizeMfr(manufacturerName);
  if (BY_MFR[key]) return BY_MFR[key];
  // Heuristic auto-adapt: unknown TZE* + 3 gangs → colored_3 shape; else V2_4
  if (hint.gangs === 3 && /^_tze\d{3}_/.test(key)) return PROFILE_COLORED_3;
  if (hint.gangs === 4 && /^_tze\d{3}_/.test(key)) return PROFILE_V2_4;
  return PROFILE_V2_4;
}

function gangStateDp(profile, gang) {
  const map = { 1: 'state_l1', 2: 'state_l2', 3: 'state_l3', 4: 'state_l4' };
  const name = map[gang];
  return name ? profile.dps[name] : null;
}

function powerOnToEnum(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'off' || v === '0') return POWER_ON.off;
  if (v === 'on' || v === '1') return POWER_ON.on;
  return POWER_ON.memory;
}

function enumToPowerOn(n) {
  if (n === 0) return 'off';
  if (n === 1) return 'on';
  return 'previous';
}

function indicatorToEnum(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'off' || v === 'none') return INDICATOR.off;
  if (v === 'switch_position' || v === 'pos' || v === 'inverted') return INDICATOR.switch_position;
  return INDICATOR.on_off_status; // normal
}

function enumToIndicator(n) {
  if (n === 0) return 'off';
  if (n === 2) return 'inverted';
  return 'normal';
}

function colorToEnum(value) {
  const v = String(value || '').toLowerCase().replace(/\s+/g, '_');
  return Object.prototype.hasOwnProperty.call(COLOR, v) ? COLOR[v] : COLOR.white;
}

module.exports = {
  PROFILE_COLORED_4,
  PROFILE_COLORED_3,
  PROFILE_SIMPLE_4,
  PROFILE_V2_4,
  BY_MFR,
  resolveEf00MultiGangProfile,
  gangStateDp,
  powerOnToEnum,
  enumToPowerOn,
  indicatorToEnum,
  enumToIndicator,
  colorToEnum,
  INDICATOR,
  POWER_ON,
  COLOR,
};
