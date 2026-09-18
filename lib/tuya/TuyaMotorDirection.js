'use strict';

/**
 * TuyaMotorDirection — Homey port of Z2M herdsman PR #13207 / #13191
 *
 * WHY(P2580): tubular / Moes covers occasionally report motor_direction as a
 * string ("back"/"forward"/"reversed"/"normal") instead of enum 0/1. Numeric-only
 * parsers flip "forward" → reverse.
 *
 * Contre quoi: open/close inverted after firmware reports strings (Z2M cover break 2.14).
 */

const FORWARD_ALIASES = new Set(['forward', 'normal', '0', 'fwd', 'cw']);
const BACK_ALIASES = new Set(['back', 'reversed', 'reverse', '1', 'rev', 'ccw']);

/**
 * @param {unknown} raw — enum number, bool, or string from MCU / settings
 * @returns {'forward'|'back'}
 */
function normalizeMotorDirection(raw) {
  if (raw === true || raw === 1 || raw === '1') return 'back';
  if (raw === false || raw === 0 || raw === '0') return 'forward';
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    if (BACK_ALIASES.has(s)) return 'back';
    if (FORWARD_ALIASES.has(s)) return 'forward';
  }
  const n = Number(raw);
  if (Number.isFinite(n)) return n === 0 ? 'forward' : 'back';
  return 'forward';
}

/** @returns {0|1} Tuya enum for TX */
function toMotorDirectionEnum(raw) {
  return normalizeMotorDirection(raw) === 'back' ? 1 : 0;
}

module.exports = {
  normalizeMotorDirection,
  toMotorDirectionEnum,
  FORWARD_ALIASES,
  BACK_ALIASES,
};
