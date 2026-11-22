'use strict';

/**
 * P3371 - open/stop/close-only covers driven by position targets.
 *
 * Source: Homey forum 146735 posts 499 and 503 (CAWV, EMTECO Wi-Fi blinds):
 * https://community.homey.app/t/146735/503
 * The device exposes windowcoverings_set + windowcoverings_state but the motor has no
 * position DP. Apple Home (HomeKit Experiment / Matter Bridge) only sends position
 * targets, so nothing moves. We never remove the capability on a paired device;
 * instead a position target is translated into open/close for such covers, and the
 * position tile follows open/close reports so the bridge sees a consistent state.
 *
 * Detection, strongest first:
 *   1. a position report ever seen        -> has position (never translate)
 *   2. explicit per-couple/driver flag    -> no position
 *   3. cloud DP table at pairing           -> no position DP: translate at once;
 *                                            a listed position DP only raises the learning bar
 *   4. runtime learning: >= minMoves open/close/stop reports without any position report
 */

const DEFAULT_MIN_MOVES = 10;

/** >= 50 % -> open (up), < 50 % -> close (down). */
function positionToState(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {return null;}
  return n >= 0.5 ? 'up' : 'down';
}

/** Final position a no-position cover is assumed to reach for a state. */
function stateToPosition(state) {
  if (state === 'up') {return 1;}
  if (state === 'down') {return 0;}
  return null;
}

/**
 * @param {{positionSeen?:boolean, flag?:boolean, cloudHasPosition?:boolean|null, moves?:number, minMoves?:number}} f
 * @returns {boolean}
 */
function isNoPosition(f = {}) {
  if (f.positionSeen === true) {return false;}
  if (f.flag === true) {return true;}
  if (f.cloudHasPosition === false) {return true;}
  let min = Number.isFinite(f.minMoves) && f.minMoves > 0 ? f.minMoves : DEFAULT_MIN_MOVES;
  // A cloud table may list percent_control on motors that ignore it (CAWV #499): it only slows learning.
  if (f.cloudHasPosition === true) {min = Math.max(min, DEFAULT_MIN_MOVES);}
  return (Number(f.moves) || 0) >= min;
}

/**
 * Does a cloud DP table (tinytuya mapping / OpenAPI functions+status) carry a position DP?
 * @returns {boolean|null} null when no table is present.
 */
function cloudTableHasPosition(table) {
  if (!table || typeof table !== 'object') {return null;}
  const entries = Object.entries(table);
  if (!entries.length) {return null;}
  const POS_CODE = /^(percent_control|percent_state|position|cur_pos|curtain_position|percent_control_\d|percent_state_\d)$/i;
  for (const [dp, e] of entries) {
    const code = e && e.code ? String(e.code) : '';
    if (POS_CODE.test(code)) {return true;}
    if (!code && (dp === '2' || dp === '3') && e && e.type === 'value') {return true;}
  }
  return false;
}

module.exports = { DEFAULT_MIN_MOVES, positionToState, stateToPosition, isNoPosition, cloudTableHasPosition };
