'use strict';

/**
 * P2258 / P2261 — Linptech ES1ZZ(TY) / Moes ZSS-LP-HP02-MS mmWave presence (TS0225)
 *
 * WHY: Settings must NOT go to EF00 DP9 (distance RX collision).
 * HOW: ZCL attribute writes on manufacturer cluster — interview lists 57346 (0xE002).
 *      ZHA/Hubitat/Z2M attrs 57348/57349/57355; herdsman name "manuSpecificTuya2" is 0xE001
 *      but device inClusterList advertises 0xE002 — write E002 first, fallback E001.
 * Contre quoi: silent settings-save failures (A_Tas #2199 / T158757).
 *
 * @see https://www.zigbee2mqtt.io/devices/ES1ZZ(TY).html
 * @see https://github.com/zigpy/zha-device-handlers/issues/3012
 */

const { equalsCI, containsCI } = require('../utils/CaseInsensitiveMatcher');

/** Verified Linptech ES1ZZ manufacturerName suffixes (Z2M fingerprint) */
const LINPTECH_MFR_MARKERS = ['t9ynfz4x', 'awarhusb', 'ewrxirng'];

/** Primary: device interview inClusterList 57346. Fallback: herdsman manuSpecificTuya2. */
const CLUSTER_LINPTECH_PRIMARY = 0xE002;
const CLUSTER_LINPTECH_FALLBACK = 0xE001;
/** @deprecated use CLUSTER_LINPTECH_PRIMARY — kept for gate/import compat */
const CLUSTER_MANU_TUYA2 = CLUSTER_LINPTECH_PRIMARY;
const CLUSTER_WRITE_CHAIN = Object.freeze([CLUSTER_LINPTECH_PRIMARY, CLUSTER_LINPTECH_FALLBACK]);

const ATTR = Object.freeze({
  presenceKeepTime: 57345,
  motionSensitivity: 57348,
  staticSensitivity: 57349,
  ledIndicator: 57353,
  targetDistance: 57354,
  motionDistance: 57355,
});

/** Homey setting id → ZCL attribute write plan */
const SETTING_ATTR_MAP = Object.freeze({
  motion_detection_sensitivity: { attr: ATTR.motionSensitivity, coerce: (v) => clampInt(v, 0, 5) },
  static_detection_sensitivity: { attr: ATTR.staticSensitivity, coerce: (v) => clampInt(v, 0, 5) },
  motion_detection_distance: { attr: ATTR.motionDistance, coerce: (v) => clampInt(v, 0, 600) },
  led_indicator: { attr: ATTR.ledIndicator, coerce: (v) => (v ? 1 : 0) },
  // Legacy compose key — map 0–9 UI to Linptech 0–5 motion scale
  radar_sensitivity: { attr: ATTR.motionSensitivity, coerce: (v) => clampInt(Math.round(Number(v) * (5 / 9)), 0, 5) },
});

/** EF00 DP writes (Linptech fading_time only on DP101 per Z2M meta) */
const SETTING_DP_MAP = Object.freeze({
  fading_time: { dp: 101, type: 'value' },
});

/** RX: attribute id → internal handler key */
const ATTR_RX_MAP = Object.freeze({
  [ATTR.targetDistance]: 'target_distance',
  [ATTR.motionDistance]: 'motion_detection_distance',
  [ATTR.motionSensitivity]: 'motion_detection_sensitivity',
  [ATTR.staticSensitivity]: 'static_detection_sensitivity',
  [ATTR.presenceKeepTime]: 'presence_keep_time',
  [ATTR.ledIndicator]: 'led_indicator',
});

const LINPTECH_SETTING_KEYS = new Set([
  ...Object.keys(SETTING_ATTR_MAP),
  ...Object.keys(SETTING_DP_MAP),
]);

function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) { return min; }
  return Math.min(max, Math.max(min, n));
}

function isLinptechES1(mfr, pid) {
  const m = String(mfr || '');
  const p = String(pid || '');
  if (!LINPTECH_MFR_MARKERS.some((mk) => containsCI(m, mk))) { return false; }
  return equalsCI(p, 'TS0225') || equalsCI(p, 'TS0601') || equalsCI(p, 'TS0601_mmwave');
}

function planSettingWrite(key, rawValue) {
  if (SETTING_ATTR_MAP[key]) {
    const { attr, coerce } = SETTING_ATTR_MAP[key];
    return {
      kind: 'zcl',
      cluster: CLUSTER_LINPTECH_PRIMARY,
      fallbackClusters: [CLUSTER_LINPTECH_FALLBACK],
      attr,
      value: coerce(rawValue),
    };
  }
  if (SETTING_DP_MAP[key]) {
    const { dp, type } = SETTING_DP_MAP[key];
    return { kind: 'dp', dp, type, value: clampInt(rawValue, 0, 10000) };
  }
  return null;
}

function isLinptechSettingKey(key) {
  return LINPTECH_SETTING_KEYS.has(key);
}

module.exports = {
  LINPTECH_MFR_MARKERS,
  CLUSTER_LINPTECH_PRIMARY,
  CLUSTER_LINPTECH_FALLBACK,
  CLUSTER_MANU_TUYA2,
  CLUSTER_WRITE_CHAIN,
  ATTR,
  SETTING_ATTR_MAP,
  SETTING_DP_MAP,
  ATTR_RX_MAP,
  isLinptechES1,
  planSettingWrite,
  isLinptechSettingKey,
  clampInt,
};
