'use strict';

/**
 * WHY(P3011): contact_sensor_zigbee + sensor_contact_water had an
 * `invertedByDefault` list checked with includesCI(mfr, id) — argument order
 * reversed (includesCI expects (array, value)), so it was ALWAYS false and the
 * v5.12.2 ZG-102ZL fix never took effect.
 *
 * Non-regressive split:
 *  - DP path (TS0601 DP1): only ids where an external source confirms the raw
 *    DP1 bit is inverted vs our generic transform get the default inversion.
 *    Source: Zigbee2MQTT hobeian.ts ZG-102ZL `[1, "contact", tuya.valueConverter.inverse]`
 *    (Koenkk/zigbee-herdsman-converters, fingerprint _TZE200_pay2byax);
 *    _TZE204_pay2byax mirrors lib/managers/AlarmPolarityManager INVERTED_POLARITY.
 *  - IAS path (_TZ3000_* TS0203): already handled by AlarmPolarityManager in
 *    IASZoneManager / UnifiedSensorBase, and these drivers never invert IAS
 *    frames locally — so they stay informational only (no double inversion).
 * User invert/reverse settings XOR the default (unchanged v5.12.3 semantics).
 */
const { includesCI } = require('../utils/TuyaNormalizer');

const DP_INVERTED_BY_DEFAULT = Object.freeze([
  '_TZE200_pay2byax',
  '_TZE204_pay2byax',
]);

const IAS_POLARITY_LISTED = Object.freeze([
  '_TZ3000_26fmupbb',
  '_TZ3000_n2egfsli',
  '_TZ3000_oxslv1c9',
  '_TZ3000_402jjyro',
  '_TZ3000_2mbfxlzr',
  '_TZ3000_bzxloft2',
  '_TZ3000_yxqnffam',
  '_TZ3000_996rpfy6',
]);

function isDpInvertedByDefault(mfr) {
  return includesCI(DP_INVERTED_BY_DEFAULT, String(mfr || ''));
}

function isIasPolarityListed(mfr) {
  return includesCI(IAS_POLARITY_LISTED, String(mfr || ''));
}

/**
 * @returns {{invertedByDefault:boolean, invertContact:boolean, userExplicitInvert:boolean}}
 */
function resolveContactInvert(mfr, userInvert, userReverse) {
  const user = !!(userInvert || userReverse);
  const invertedByDefault = isDpInvertedByDefault(mfr);
  if (invertedByDefault) {
    return { invertedByDefault, invertContact: !user, userExplicitInvert: false };
  }
  return { invertedByDefault, invertContact: user, userExplicitInvert: user };
}

module.exports = {
  DP_INVERTED_BY_DEFAULT,
  IAS_POLARITY_LISTED,
  isDpInvertedByDefault,
  isIasPolarityListed,
  resolveContactInvert,
};
