'use strict';

/**
 * WHY(P2296): Homey SDK battery-status — measure_battery XOR alarm_battery;
 * energy.batteries required when either is present.
 * Zemismart ZM16EL / ZM85EL group reports powerSource=Battery + DP13 %
 * (Z2M #28655 / #29124). Never treat as mains or strip measure_battery.
 */

const BATTERY_COVER_MFR_RE =
  /68nvbio9|68nvbi09|cf1sl3tj|pw7mji0l|nw1r9hp6|9p5xmj5r|vexa5o82|eevqq1uv|ba69l9ol|sfqyhvpv|ejh6owwz|m6lwazh9|fodv6bkr|libht6ua/i;

/** Mains NDIR CO2 routers — no battery UI (Z2M ogkdpgy2 / 3ejwxpmu). */
const MAINS_CO2_MFR_RE = /ogkdpgy2|3ejwxpmu|8ygsuhe1|y6rqas8p/i;

function isBatteryCoverMfr(mfr) {
  return BATTERY_COVER_MFR_RE.test(String(mfr || ''));
}

function isMainsCo2Mfr(mfr) {
  return MAINS_CO2_MFR_RE.test(String(mfr || ''));
}

module.exports = {
  BATTERY_COVER_MFR_RE,
  MAINS_CO2_MFR_RE,
  isBatteryCoverMfr,
  isMainsCo2Mfr,
};
