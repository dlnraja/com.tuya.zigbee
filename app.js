'use strict';

const Homey = require('homey');
const { registerCustomClusters } = require('./lib/registerClusters');

class UniversalTuyaZigbeeApp extends Homey.App {
  _flowCardsRegistered = false;


  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    if (this._flowCardsRegistered) {
      this.log('⏭️  Flow cards already registered');
      return;
    }
    
    this._flowCardsRegistered = true;

    this.log('Universal Tuya Zigbee App is initializing...');

    // CRITICAL: Register custom Zigbee clusters FIRST
    // This must happen before any devices initialize
    try {
      registerCustomClusters(this);
      this.log('✅ Custom Zigbee clusters registered');
    } catch (err) {
      this.error('❌ Failed to register custom clusters:', err);
    }

    this.log('✅ Universal Tuya Zigbee App has been initialized');
  }

}

module.exports = UniversalTuyaZigbeeApp;
