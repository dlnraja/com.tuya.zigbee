/**
 * Tuya DP Device Helper
 * According to CURSOR_REFACTOR_GUIDE_PART1.md Phase 6
 *
 * Purpose: Separate Tuya DP devices from standard Zigbee devices
 * to avoid timeout errors on cluster configuration
 */

'use strict';

class TuyaDPDeviceHelper {

  /**
   * Check if device is a Tuya DP device (uses 0xEF00 cluster)
   * These devices do NOT follow standard ZCL reporting
   *
   * @param {Object} device - Homey device instance
   * @returns {boolean} - True if Tuya DP device
   */
  static isTuyaDPDevice(device) {
    if (!device) return false;

    try {
      const data = device.getData();
      const productId = data?.productId;
      const manufacturerName = data?.manufacturerName;

      // Check product ID patterns
      if (productId === 'TS0601') return true;
      if (productId?.startsWith('TS06')) return true;

      // Check manufacturer name patterns (case-insensitive)
      const mfrLower = (manufacturerName || '').toLowerCase();
      const pidLower = (productId || '').toLowerCase();
      if (mfrLower.startsWith('_tze')) return true;
      if (mfrLower.startsWith('_tz3000_')) {
        // Some _TZ3000_ are Tuya DP, some are standard
        // TS0601 is the main indicator
        return pidLower === 'ts0601';
      }

      return false;

    } catch (error) {
      // If getData() fails, assume standard Zigbee
      return false;
    }
  }

  /**
   * Check if standard cluster configuration should be skipped
   *
   * @param {Object} device - Homey device instance
   * @param {string} clusterName - Cluster name (e.g., 'powerConfiguration')
   * @returns {boolean} - True if should skip
   */
  static shouldSkipStandardCluster(device, clusterName) {
    if (!this.isTuyaDPDevice(device)) {
      return false;
    }

    // For Tuya DP devices, skip these standard clusters
    const skipClusters = [
      'powerConfiguration',      // 0x0001
      'temperatureMeasurement',  // 0x0402
      'humidityMeasurement',     // 0x0405
      'illuminanceMeasurement',  // 0x0400
      'occupancySensing'         // 0x0406
    ];

    return skipClusters.includes(clusterName);
  }

  /**
   * Log appropriate message for cluster configuration
   *
   * @param {Object} device - Homey device instance
   * @param {string} action - 'skip' or 'configure'
   */
  static logClusterAction(device, action = 'skip') {
    if (!device || !device.log) return;

    if (action === 'skip') {
      device.log('[TUYA-DP] Device uses 0xEF00 - skipping standard ZCL config');
      device.log('[TUYA-DP] Relying on DP reports only');
    } else if (action === 'configure') {
      device.log('[STANDARD-ZCL] Configuring standard clusters...');
    }
  }

  /**
   * Get device type description
   *
   * @param {Object} device - Homey device instance
   * @returns {string} - Device type description
   */
  static getDeviceType(device) {
    return this.isTuyaDPDevice(device) ? 'Tuya DP (0xEF00)' : 'Standard Zigbee';
  }

  /**
   * Get expected behavior description
   *
   * @param {Object} device - Homey device instance
   * @returns {string} - Behavior description
   */
  static getExpectedBehavior(device) {
    if (this.isTuyaDPDevice(device)) {
      return 'Event-based DP reports, no standard cluster polling';
    } else {
      return 'Standard ZCL attribute reporting';
    }
  }
}

module.exports = TuyaDPDeviceHelper;
