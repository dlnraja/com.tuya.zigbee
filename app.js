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

    // Register global flow cards for energy management
    this.registerFlowCards();

    this.log('✅ Universal Tuya Zigbee App has been initialized');
  }

  /**
   * Register global flow cards for advanced energy management
   * NOTE: Flow cards must be defined in app.json first
   */
  registerFlowCards() {
    this.log('📋 Registering global flow cards...');

    try {
      // Only register flow cards that exist in app.json
      // Uncomment these when flow cards are added to app.json
      
      /*
      // Condition: Check if battery below threshold
      this.homey.flow.getConditionCard('battery_below_threshold')
        .registerRunListener(async (args, state) => {
          const device = args.device;
          const threshold = args.threshold;
          
          if (!device.hasCapability('measure_battery')) {
            return false;
          }
          
          const batteryLevel = device.getCapabilityValue('measure_battery');
          return batteryLevel < threshold;
        });
      */

      this.log('✅ Global flow cards registered (none defined yet)');
    } catch (err) {
      this.error('⚠️  Error registering flow cards:', err.message);
      // Don't crash the app if flow cards fail to register
    }
  }

}

module.exports = UniversalTuyaZigbeeApp;
