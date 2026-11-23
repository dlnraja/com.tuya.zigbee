'use strict';

/**
 * P3384 / Tuya Local 154077 #499 (Andi, Mikko, Nedis WIFIPO120FWT):
 * UPDATEDPS (cmd 18) must list measurement DPs only. Naming the switch DP
 * (usually DP 1) in that refresh broke local ON/OFF on a Nedis plug.
 * On init, use DP_QUERY (cmd 10 / 16) to read the switch state, never cmd 18.
 */

const DEFAULT_MEASUREMENT_DPS = Object.freeze([18, 19, 20]);
const DEFAULT_SWITCH_DPS = Object.freeze([1]);

function isSwitchDp(dp, switchDps) {
  const n = Number(dp);
  const list = Array.isArray(switchDps) && switchDps.length ? switchDps : DEFAULT_SWITCH_DPS;
  return list.map(Number).includes(n);
}

function measurementRefreshIds(dpIds, options) {
  const opts = options || {};
  const switchDps = opts.switchDps || DEFAULT_SWITCH_DPS;
  const source = Array.isArray(dpIds) && dpIds.length ? dpIds : opts.defaultMeasurementDps || DEFAULT_MEASUREMENT_DPS;
  const ids = [...new Set(source.map(Number).filter((n) => Number.isInteger(n) && n > 0 && n < 256))]
    .filter((n) => !isSwitchDp(n, switchDps))
    .slice(0, 32);
  return ids.length ? ids : DEFAULT_MEASUREMENT_DPS.slice();
}

function refreshPayload(dpIds, options) {
  return { dpId: measurementRefreshIds(dpIds, options) };
}

module.exports = {
  DEFAULT_MEASUREMENT_DPS,
  DEFAULT_SWITCH_DPS,
  isSwitchDp,
  measurementRefreshIds,
  refreshPayload,
};
