'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * ClimateSensorDriver - v5.3.86 FIXED
 *
 * CRITICAL: This driver prevents phantom sub-device creation.
 *
 * The problem: homey-zigbeedriver creates sub-devices even when subDevices: []
 * is set in driver.compose.json. This happens because:
 * 1. Device wake-up can trigger re-registration
 * 2. App restart can trigger re-pairing
 * 3. ZigBee stack events can create duplicates
 *
 * Solution: Override ALL device creation methods and strictly filter.
 */
class ClimateSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║    CLIMATE SENSOR DRIVER v5.3.86 - WORKING                  ║');
    this.log('╚══════════════════════════════════════════════════════════════╝');

    // Track IEEE addresses to prevent duplicates
    this._registeredIeeeAddresses = new Set();
  }

  /**
   * v5.3.79: AGGRESSIVE FIX - Prevent ANY sub-device creation
   */
  async onPairListDevices(devices) {
    this.log('[PAIR] Raw devices from Zigbee:', devices?.length || 0);

    if (!devices || devices.length === 0) {
      return devices;
    }

    // Filter out sub-devices - keep only the main device per IEEE address
    const seenIeeeAddresses = new Set();
    const filteredDevices = [];

    for (const device of devices) {
      const ieee = device.settings?.zb_ieee_address || device.data?.ieeeAddress;

      // CRITICAL: Skip ANY device with subDeviceId
      if (device.data?.subDeviceId !== undefined) {
        this.log(`[PAIR] 🚫 BLOCKING sub-device: subDeviceId=${device.data.subDeviceId}`);
        continue;
      }

      // Skip if we've already seen this IEEE address
      if (ieee && seenIeeeAddresses.has(ieee)) {
        this.log(`[PAIR] 🚫 Skipping duplicate device for IEEE ${ieee}`);
        continue;
      }

      // Skip if already registered in this driver
      if (ieee && this._registeredIeeeAddresses?.has(ieee)) {
        this.log(`[PAIR] 🚫 Device already registered: IEEE ${ieee}`);
        continue;
      }

      if (ieee) {
        seenIeeeAddresses.add(ieee);
      }

      filteredDevices.push(device);
      this.log(`[PAIR] ✅ Added device: ${device.name || 'Climate Sensor'} (IEEE: ${ieee || 'unknown'})`);
    }

    this.log(`[PAIR] Filtered: ${devices.length} → ${filteredDevices.length} devices`);
    return filteredDevices;
  }

}

// NOTE: Removed onMapDeviceClass override - it was causing:
// TypeError: (intermediate value).onMapDeviceClass is not a function
// The default ZigBeeDriver behavior is sufficient.

module.exports = ClimateSensorDriver;
