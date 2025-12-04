'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ClimateSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ClimateSensorDriver initialized');
  }

  /**
   * v5.3.62: CRITICAL FIX - Prevent sub-device creation!
   * Climate sensors are SINGLE devices, NOT multi-gang switches.
   *
   * This override ensures only ONE device is created per physical device.
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

      // Skip if we've already seen this IEEE address
      if (ieee && seenIeeeAddresses.has(ieee)) {
        this.log(`[PAIR] 🚫 Skipping duplicate device for IEEE ${ieee}`);
        continue;
      }

      // Remove subDeviceId if present - climate sensors don't have sub-devices
      if (device.data?.subDeviceId !== undefined) {
        this.log(`[PAIR] 🚫 Removing subDeviceId from device`);
        delete device.data.subDeviceId;
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

module.exports = ClimateSensorDriver;
