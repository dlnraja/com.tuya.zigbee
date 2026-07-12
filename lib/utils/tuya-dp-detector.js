'use strict';
/**
 * Tuya DP Detector - extracted from lib/helpers/device_helpers.js
 *
 * Single source of truth for "is this device a Tuya DP device?"
 * Extracted to break the circular dependency between:
 *   - lib/helpers/device_helpers.js
 *   - lib/utils/safe-auto-migrate.js
 *
 * Both files now import isTuyaDP from here.
 *
 * Tuya DP devices:
 * - Use cluster 0xEF00 (manuSpecificTuya) instead of standard Zigbee
 * - ModelID = TS0601 (always)
 * - Manufacturer starts with _TZE (Tuya Zigbee Endpoint)
 * - Some _TZ3000 devices also use DP (less common)
 */

/**
 * @param {Object} deviceInfo - Device information (modelId, manufacturer, clusters, zclNode)
 * @param {Object} device - Optional: Homey device instance for logging
 * @returns {boolean} - True if Tuya DP device
 */
function isTuyaDP(deviceInfo, device = null) {
  try {
    const modelId = (deviceInfo.modelId || '').toUpperCase();
    const manufacturer = (deviceInfo.manufacturer || '').toUpperCase();

    // EXCLUSION LIST: Known NON-Tuya manufacturers
    // These use standard Zigbee, NOT Tuya DP protocol
    const nonTuyaManufacturers = [
      'HOBEIAN',      // ZG-204ZL motion sensor - uses IAS Zone
      'PHILIPS',
      'IKEA',
      'OSRAM',
      'LEDVANCE',
      'HEIMAN',
      'XIAOMI',
      'LUMI',         // Aqara
      'SONOFF',
      'EWELINK',
      'GLEDOPTO',
      'INNR',
      'SENGLED',
      'CENTRALITE',
      'SMARTTHINGS',
      'SAMJIN',
    ];

    // If manufacturer is in exclusion list, NOT Tuya DP
    if (nonTuyaManufacturers.some((m) => manufacturer.toUpperCase().includes(m.toUpperCase()))) {
      if (device && device.log) device.log(`[isTuyaDP] ❌ ${manufacturer} is in exclusion list → Standard Zigbee`);
      return false;
    }

    // RULE 1: TS0601 is ALWAYS Tuya DP (100% certainty)
    if (modelId.toUpperCase() === 'TS0601') {
      if (device && device.log) device.log('[isTuyaDP] ✅ TS0601 detected → Tuya DP device');
      return true;
    }

    // RULE 2: _TZE manufacturer prefix (Tuya Zigbee Endpoint devices)
    if (manufacturer.toUpperCase().startsWith('_TZE')) {
      if (device && device.log) device.log(`[isTuyaDP] ✅ ${manufacturer} detected → Tuya DP device`);
      return true;
    }

    // RULE 3: Check for cluster 0xEF00 presence - ONLY if manufacturer is Tuya-like
    const isTuyaPrefix = manufacturer.toUpperCase().startsWith('_TZ');
    if (deviceInfo.zclNode && isTuyaPrefix) {
      try {
        const endpoints = deviceInfo.zclNode.endpoints || {};
        for (const ep of Object.values(endpoints)) {
          if (ep.clusters && (ep.clusters[0xEF00] || ep.clusters[61184])) {
            if (device && device.log) device.log('[isTuyaDP] ✅ Cluster 0xEF00 found + Tuya prefix → Tuya DP device');
            return true;
          }
        }
      } catch (e) {
        // Ignore cluster check errors
      }
    }

    if (device && device.log) device.log(`[isTuyaDP] ❌ ${modelId}/${manufacturer} → Standard Zigbee`);
    return false;
  } catch (err) {
    if (device && device.error) device.error('[isTuyaDP] Detection error:', err.message);
    return false;
  }
}

module.exports = { isTuyaDP };
