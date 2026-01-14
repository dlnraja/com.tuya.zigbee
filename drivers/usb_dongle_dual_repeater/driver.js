'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.534: FIXED to use ZigBeeDriver + await super.onInit()
 */
class USBHubDualDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit(); // v5.5.534: SDK3 CRITICAL
    this.log('USB Hub Dual Driver v5.5.534 initialized');
  }
}

module.exports = USBHubDualDriver;
