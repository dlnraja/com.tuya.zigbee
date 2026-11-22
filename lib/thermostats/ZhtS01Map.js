'use strict';

/**
 * Moes ZHT-S01 sacred couple and core DP map.
 * Source (single reliable): Zigbee2MQTT / zigbee-herdsman-converters
 *   src/devices/moes.ts model "ZHT-S01"
 *   fingerprint TS0601 + _TZE284_rlytpmij
 *   https://www.zigbee2mqtt.io/devices/ZHT-S01.html
 *
 * Core capabilities only (additive on wall_thermostat, which already
 * exposes them). Schedule / floor / fault DPs are not invented as new
 * published capabilities here.
 */

const { equalsCI } = require('../utils/CaseInsensitiveMatcher');

const MFRS = Object.freeze(['_TZE284_rlytpmij']);
const PID = 'TS0601';

const DATA_POINTS = Object.freeze({
  onOff: 1,          // system_mode heat/off as boolean
  preset: 2,
  currentTemperature: 117, // local_temperature /10 (air / internal)
  targetTemperature: 111,  // current_heating_setpoint /10
  childlock: 39,
});

function isZhtS01Couple(mfr, pid) {
  const manufacturer = String(mfr || '');
  const product = String(pid || 'TS0601');
  if (!equalsCI(product, PID) && product !== '') {return false;}
  return MFRS.some((name) => equalsCI(manufacturer, name));
}

function scaleTemp(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n)) {return null;}
  return Math.round(n) / 10;
}

function unscaleTemp(degrees) {
  const n = Number(degrees);
  if (!Number.isFinite(n)) {return null;}
  return Math.round(n * 10);
}

module.exports = {
  MFRS,
  PID,
  DATA_POINTS,
  isZhtS01Couple,
  scaleTemp,
  unscaleTemp,
};
