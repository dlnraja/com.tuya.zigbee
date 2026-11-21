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

module.exports = { tuyaPercentToValvePosition, valvePositionToTuyaPercent };
