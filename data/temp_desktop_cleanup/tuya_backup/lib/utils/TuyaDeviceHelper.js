'use strict';

/**
 * TUYA DEVICE HELPER - v5.0.9
 *
 * Separates two distinct concepts:
 * 1. isTuyaDPDevice() - Is this device a Tuya DP protocol device (TS0601 + _TZE* etc)?
 * 2. hasTuyaClusterOnHomey() - Does Homey expose the 0xEF00 cluster for this device?
 *
 * These are NOT the same thing:
 * - A device CAN be a Tuya DP device (isTuyaDPDevice = true)
 * - But Homey might NOT expose the cluster (hasTuyaClusterOnHomey = false)
 *
 * When hasTuyaClusterOnHomey = false, we should:
 * - NOT attempt requestDP() calls (they will fail)
 * - Still listen for passive DP reports if they arrive
 * - Fall back to ZCL clusters if available
 */

class TuyaDeviceHelper {

  /**
   * Check if device is a Tuya DP protocol device (by model/manufacturer)
   * This is a LOGICAL check based on device identity, not cluster availability
   *
   * @param {Object} meta - { manufacturerName, modelId }
   * @returns {boolean}
   */
  static isTuyaDPDevice(meta) {
    const { manufacturerName = '', modelId = '' } = meta || {};

    // TS0601 with Tuya manufacturer = Always Tuya DP
    if (modelId === 'TS0601') {
      if (/^_TZE|^_TZ3000|^_TZ3210|^_TYST/.test(manufacturerName)) {
        return true;
      }
      // Any TS0601 is Tuya DP
      return true;
    }

    // TS0225 (mmWave sensors) with Tuya manufacturer
    if (modelId === 'TS0225' && /^_TZE/.test(manufacturerName)) {
      return true;
    }

    // Other Tuya DP models
    const tuyaDPModels = ['TS0601', 'TS0225'];
    if (tuyaDPModels.includes(modelId)) {
      return true;
    }

    // Check manufacturer pattern
    if (/^_TZE200_|^_TZE204_|^_TZE284_/.test(manufacturerName)) {
      return true;
    }

    return false;
  }

  /**
   * Check if Homey exposes the Tuya cluster (0xEF00) for this device
   * This is a RUNTIME check - depends on what Homey actually sees
   *
   * @param {Object} zclNode - The Zigbee ZCL node
   * @returns {boolean}
   */
  static hasTuyaClusterOnHomey(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      if (!endpoint) {
        return false;
      }

      // Check for various Tuya cluster names
      const tuyaCluster = endpoint.clusters.tuyaManufacturer
        || endpoint.clusters.tuyaSpecific
        || endpoint.clusters.manuSpecificTuya
        || endpoint.clusters[0xEF00]
        || endpoint.clusters['61184']; // 0xEF00 in decimal

      return !!tuyaCluster;
    } catch (err) {
      return false;
    }
  }

  /**
   * Get device metadata from a Homey device
   *
   * @param {Object} device - Homey device instance
   * @returns {Object} { manufacturerName, modelId, productId }
   */
  static getDeviceMeta(device) {
    try {
      const data = device.getData?.() || {};
      const store = device.getStore?.() || {};
      const settings = device.getSettings?.() || {};

      return {
        manufacturerName: data.manufacturerName
          || store.manufacturerName
          || settings.manufacturerName
          || device.zclNode?.manufacturerName
          || '',
        modelId: data.modelId
          || data.productId
          || store.modelId
          || settings.modelId
          || device.zclNode?.modelId
          || '',
        productId: data.productId
          || store.productId
          || ''
      };
    } catch (err) {
      return { manufacturerName: '', modelId: '', productId: '' };
    }
  }

  /**
   * Determine the best battery method for a device
   *
   * @param {Object} device - Homey device instance
   * @param {Object} zclNode - Zigbee ZCL node
   * @returns {Object} { useTuyaDP: boolean, useZCL: boolean, reason: string }
   */
  static determineBatteryMethod(device, zclNode) {
    const meta = this.getDeviceMeta(device);
    const isTuyaDP = this.isTuyaDPDevice(meta);
    const hasTuyaCluster = this.hasTuyaClusterOnHomey(zclNode);

    // Check for ZCL power configuration
    const hasZCLPower = !!zclNode?.endpoints?.[1]?.clusters?.genPowerCfg;

    if (isTuyaDP && hasTuyaCluster) {
      return {
        useTuyaDP: true,
        useZCL: false,
        reason: 'Tuya DP device with cluster available'
      };
    }

    if (isTuyaDP && !hasTuyaCluster) {
      return {
        useTuyaDP: false,  // Can't use DP - cluster not available
        useZCL: hasZCLPower,
        reason: 'Tuya DP device but cluster NOT available on Homey - will use passive reports or ZCL'
      };
    }

    if (hasZCLPower) {
      return {
        useTuyaDP: false,
        useZCL: true,
        reason: 'Standard Zigbee with ZCL power cluster'
      };
    }

    return {
      useTuyaDP: false,
      useZCL: false,
      reason: 'No battery method available'
    };
  }

  /**
   * Log device detection info for debugging
   *
   * @param {Object} device - Homey device instance
   * @param {Object} zclNode - Zigbee ZCL node
   */
  static logDeviceInfo(device, zclNode) {
    const meta = this.getDeviceMeta(device);
    const isTuyaDP = this.isTuyaDPDevice(meta);
    const hasTuyaCluster = this.hasTuyaClusterOnHomey(zclNode);
    const batteryMethod = this.determineBatteryMethod(device, zclNode);

    device.log('[TUYA-HELPER] 📋 Device Analysis:');
    device.log(`  - Manufacturer: ${meta.manufacturerName}`);
    device.log(`  - Model: ${meta.modelId}`);
    device.log(`  - isTuyaDPDevice: ${isTuyaDP}`);
    device.log(`  - hasTuyaClusterOnHomey: ${hasTuyaCluster}`);
    device.log(`  - Battery Method: ${batteryMethod.reason}`);

    if (isTuyaDP && !hasTuyaCluster) {
      device.log('[TUYA-HELPER] ⚠️  IMPORTANT: This is a Tuya DP device but Homey does NOT expose the EF00 cluster');
      device.log('[TUYA-HELPER] ⚠️  Will NOT attempt requestDP() - only listen for passive reports');
    }

    return { meta, isTuyaDP, hasTuyaCluster, batteryMethod };
  }
}

module.exports = TuyaDeviceHelper;
