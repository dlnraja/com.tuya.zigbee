'use strict';
const CI = require('../utils/CaseInsensitiveMatcher');

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * BaseZigBeeDriver - Base driver for ALL Tuya Zigbee drivers
 *
 * v5.3.63: CRITICAL FIX - Prevents sub-device creation for ALL drivers!
 *
 * Sub-devices are only needed for multi-gang switches (2-gang, 3-gang, etc.)
 * For single-endpoint devices (sensors, plugs, bulbs), sub-devices cause duplicates.
 */
class BaseZigBeeDriver extends ZigBeeDriver {
  getDeviceById(id) { try { return super.getDeviceById(id); } catch (err) { this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`); return null; } }

  /**
   * v7.5.0: Case-insensitive initialization normalization
   */
  async onInit() {
    await super.onInit();
    const driverId = this.id || this.manifest?.id || 'unknown';// Normalize manufacturer-related settings and store values
    try {
      const devices = this.getDevices();
      for (const device of devices) {
        if (typeof device.getSettings === 'function') {
          const settings = device.getSettings();
          let needsUpdate = false;

          // Normalize manufacturerName in settings
          if (settings.tuya_manufacturer_name) {
            const normalized = CI.normalize(settings.tuya_manufacturer_name);
            if (normalized !== settings.tuya_manufacturer_name) {
              settings.tuya_manufacturer_name = normalized;
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            this.log(`[INIT] ${driverId}: Normalizing settings for ${device.getName()}`);
            await device.setSettings(settings).catch(e => this.error(`[INIT] Failed to update settings: ${e.message}`));
          }
        }
      }
    } catch (err) {
      this.error(`[INIT] ${driverId}: Error during manufacturer normalization: ${err.message}`);
    }
  }

  /**
   * Override to filter out sub-devices during pairing
   * This prevents phantom device creation for single-endpoint devices
   */
  async onPairListDevices(devices) {
    const driverManifest = this.manifest || {};
    const driverName = driverManifest.name?.en || this.id || 'unknown';this.log(`[PAIR] ${driverName}: Raw devices from Zigbee:`, devices?.length || 0);

    if (!devices || devices.length === 0) {
      return devices;
    }

    // Check if this driver should allow sub-devices (multi-gang switches)
    const allowSubDevices = this._shouldAllowSubDevices();

    if (allowSubDevices) {
      this.log(`[PAIR] ${driverName}: Multi-gang driver - allowing sub-devices`);
      return devices;
    }

    // Filter out sub-devices - keep only the main device per IEEE address
    const seenIeeeAddresses = new Set();
    const filteredDevices = [];

    for (const device of devices) {
      const ieee = device.settings?.zb_ieee_address ||
        device.data?.ieeeAddress ||
        device.data?.token;

      // v7.5.0: Normalize manufacturerName during pairing to resolve variant mismatches
      if (device.data?.manufacturerName) {
        device.data.manufacturerName = CI.normalize(device.data.manufacturerName);
      }
      if (device.settings?.tuya_manufacturer_name) {
        device.settings.tuya_manufacturer_name = CI.normalize(device.settings.tuya_manufacturer_name);
      }

      // Skip if we've already seen this IEEE address
      if (ieee && seenIeeeAddresses.has(ieee)) {
        this.log(`[PAIR] ðŸš« Skipping duplicate device for IEEE ${ieee}`);
        continue;
      }

      // Remove subDeviceId if present
      if (device.data?.subDeviceId !== undefined) {
        this.log(`[PAIR] ðŸš« Removing subDeviceId ${device.data.subDeviceId} from device`);
        delete device.data.subDeviceId;
      }

      if (ieee) {
        seenIeeeAddresses.add(ieee);
      }

      filteredDevices.push(device);
      this.log(`[PAIR] ✅ Added device: ${device.name || driverName} (IEEE: ${ieee || 'unknown'})`);
    }

    this.log(`[PAIR] Filtered: ${devices.length} â†’ ${filteredDevices.length} devices`);
    return filteredDevices;
  }

  /**
   * Determine if this driver should allow sub-devices
   * Override in specific drivers if needed
   */
  _shouldAllowSubDevices() {
    const driverManifest = this.manifest || {};
    const driverId = this.id || driverManifest.id || '';

    // Multi-gang switches need sub-devices
    const multiGangPatterns = [
      'switch_2gang',
      'switch_3gang',
      'switch_4gang',
      'switch_6gang',
      'usb_outlet_2port',
      'usb_outlet_3gang',
      'multi_socket',
      'power_strip'
    ];

    for (const pattern of multiGangPatterns) {
      if (driverId.includes(pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Safe helper to retrieve flow cards without crashing
   * v7.5.0: Enhanced with multi-stage discovery
   */
  _getFlowCard(id, type = 'trigger') {
    try {
      if (!id) return null;
      if (!this.homey || !this.homey.flow) return null;

      const typeMap = {
        'trigger': ['getTriggerCard'],
        'condition': ['getConditionCard'],
        'action': ['getActionCard'],
      };
      
      const candidates = typeMap[type] || [type];
      const driverId = this.id || this.manifest?.id || 'unknown';const idVariants = [id];
      if (driverId !== 'unknown') {
        idVariants.push(`${driverId}_${id}`);
        idVariants.push(`${driverId}:${id}`);
      }
      if (!id.startsWith('tuya_')) idVariants.push(`tuya_${id}`);

      for (const method of candidates) {
        const flowMethod = this.homey.flow[method];
        if (typeof flowMethod === 'function') {
          for (const variantId of idVariants) {
            try {
              const card = flowMethod.call(this.homey.flow, variantId);
              if (card) return card;
            } catch (e) { /* continue */ }
          }
        }
      }

      this.log?.(`[DRIVER-SAFE] No valid flow card found for ID: ${id} (variants: ${idVariants.join(', ')})`);
    } catch (err) {
      if (this.error) this.error(`[DRIVER-SAFE] Failed to load ${type} card ${id}:`, err.message);
    }
    return null;
  }
}

module.exports = BaseZigBeeDriver;


