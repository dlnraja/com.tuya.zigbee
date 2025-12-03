'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * GENERIC TUYA DRIVER
 *
 * Fallback driver for unknown TS0601 Tuya devices.
 * Low priority matching - only matches if no other driver claims the device.
 */
class GenericTuyaDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Generic Tuya Driver initialized');
    this.log('This driver handles unknown TS0601 devices with auto-discovery');
  }

  /**
   * Called when a device is being paired
   * We can add custom logic here if needed
   */
  async onPairListDevices() {
    this.log('Listing devices for pairing...');
    return [];
  }
}

module.exports = GenericTuyaDriver;
