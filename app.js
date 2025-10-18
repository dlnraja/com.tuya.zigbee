'use strict';

const Homey = require('homey');
const { registerCustomClusters } = require('./lib/registerClusters');

class UniversalTuyaZigbeeApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Universal Tuya Zigbee App is initializing...');

    // CRITICAL: Register custom Zigbee clusters FIRST
    // This must happen before any devices initialize
    try {
      registerCustomClusters();
      this.log('✅ Custom Zigbee clusters registered');
    } catch (err) {
      this.error('❌ Failed to register custom clusters:', err);
    }

    this.log('✅ Universal Tuya Zigbee App has been initialized');
  }

}

module.exports = UniversalTuyaZigbeeApp;
