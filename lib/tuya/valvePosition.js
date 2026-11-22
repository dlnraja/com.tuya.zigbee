'use strict';

/**
 * Homey `valve_position` (SDK 12.2+) is 0-1 with a % label.
 * Tuya water-valve DPs (FrankEver DP102 / DP101) report 0-100.
 * A 0-100 value stored as-is is rejected or clamped, so the tile stays empty.
 */

function tuyaPercentToValvePosition(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  const unit = n > 1 ? n / 100 : n;
  const rounded = Math.round(unit * 100) / 100;
  return Math.max(0, Math.min(1, rounded));
}

function valvePositionToTuyaPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  const pct = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

const POWER_OFF_FROM_DP = { 0: 'close', 1: 'open', 2: 'memory' };
const POWER_OFF_TO_DP = { close: 0, open: 1, memory: 2, off: 0, on: 1, maintain: 2 };

function powerOffStateFromDp(value) {
  const key = typeof value === 'string' && POWER_OFF_TO_DP[value] != null ? POWER_OFF_TO_DP[value] : Number(value);
  return POWER_OFF_FROM_DP[key] || null;
}

function powerOffStateToDp(value) {
  if (value == null) {
    return null;
  }
  if (POWER_OFF_TO_DP[value] != null) {
    return POWER_OFF_TO_DP[value];
  }
  const n = Number(value);
  return n === 0 || n === 1 || n === 2 ? n : null;
}

module.exports = {
  tuyaPercentToValvePosition,
  valvePositionToTuyaPercent,
  powerOffStateFromDp,
  powerOffStateToDp,
};
