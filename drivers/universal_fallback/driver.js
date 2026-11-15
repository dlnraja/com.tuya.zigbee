'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UniversalFallbackDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('[UNIVERSAL-DRIVER] [OK] Universal Fallback Driver initialized');
    this.log('[UNIVERSAL-DRIVER] [FIX] Catches unknown Tuya/Zigbee devices');
  }

  async onPairListDevices() {
    this.log('[UNIVERSAL-DRIVER] [SCAN] Listing devices for pairing...');
    return [];
  }

}

module.exports = UniversalFallbackDriver;
