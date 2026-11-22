'use strict';

/**
 * P3374 - Moes ZC-LP01 / Nova EPJ-ZB sliding window pushers.
 * Sources (exact couples, do not invent ids):
 *   Z2M ZC-LP01 https://www.zigbee2mqtt.io/devices/ZC-LP01.html
 *   ZHC moes.ts fingerprint TS0601 + _TZ3210_5rta89nj (DP 4/102/104/105/106/110/112)
 *   ZHC tuya.ts EPJ-ZB TS0601 + _TZ3210_emqmwtym (same DP family)
 *   Homey forum 156967 #101 (ernesto_pons_montoro): ZC-LP01-MS _TZ3210_5rta89nj TS0601
 *
 * Generic curtain_motor maps DP102=close_time and DP104=lux, which is wrong here.
 * Sacred couple lock only - never key on manufacturer alone.
 */

const PUSHER_MFRS = new Set([
  '_tz3210_5rta89nj',
  '_tz3210_emqmwtym',
]);

function normMfr(mfr) {
  return String(mfr || '').trim().toLowerCase();
}

function normPid(pid) {
  return String(pid || '').trim().toUpperCase();
}

function isSlidingWindowPusherCouple(mfr, pid) {
  return normPid(pid) === 'TS0601' && PUSHER_MFRS.has(normMfr(mfr));
}

/** Default (invert_cover false): OPEN=0, CLOSE=1, STOP=2. Inverted swaps open/close. */
function encodePusherState(state, invert) {
  const s = String(state || '').toLowerCase();
  const open = invert ? 1 : 0;
  const close = invert ? 0 : 1;
  if (s === 'up' || s === 'open') {return open;}
  if (s === 'down' || s === 'close') {return close;}
  return 2;
}

function decodePusherState(value, invert) {
  const n = Number(value);
  const open = invert ? 1 : 0;
  const close = invert ? 0 : 1;
  if (n === open || value === 'open') {return 'up';}
  if (n === close || value === 'close') {return 'down';}
  return 'idle';
}

function slidingWindowPusherDpMappings(invert) {
  return {
    4: { capability: 'measure_battery', divisor: 1 },
    102: {
      capability: 'windowcoverings_state',
      role: 'state',
      writable: true,
      transform: (v) => decodePusherState(v, invert),
    },
    104: {
      capability: 'windowcoverings_set',
      role: 'actual',
      writable: true,
      coverPosition: true,
      transform: (v) => Number(v) / 100,
    },
    105: { capability: null, internal: 'charging' },
    106: { capability: null, internal: 'automatic_mode', writable: true },
    110: { capability: null, internal: 'slow_mode', writable: true },
    112: { capability: null, internal: 'button_position', writable: true },
  };
}

function pusherWriteDps() {
  return { state: 102, position: 104, stateType: 'enum', positionType: 'value' };
}

module.exports = {
  PUSHER_MFRS,
  isSlidingWindowPusherCouple,
  encodePusherState,
  decodePusherState,
  slidingWindowPusherDpMappings,
  pusherWriteDps,
};
