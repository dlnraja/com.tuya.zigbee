'use strict';

const Homey = require('homey');
const { registerCustomClusters } = require('./lib/registerClusters');
const FlowCardManager = require('./lib/FlowCardManager');
const CapabilityManager = require('./lib/utils/CapabilityManager');

class UniversalTuyaZigbeeApp extends Homey.App {
  _flowCardsRegistered = false;
  flowCardManager = null;
  capabilityManager = null;


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

    // Initialize CapabilityManager for safe capability creation
    this.capabilityManager = new CapabilityManager(this.homey);
    this.log('✅ CapabilityManager initialized');

    // CRITICAL: Register custom Zigbee clusters FIRST
    // This must happen before any devices initialize
    try {
      registerCustomClusters(this);
      this.log('✅ Custom Zigbee clusters registered');
    } catch (err) {
      this.error('❌ Failed to register custom clusters:', err);
    }

    // Register ALL flow cards (+33 nouveaux!)
    this.flowCardManager = new FlowCardManager(this.homey);
    this.flowCardManager.registerAll();
    this.log('✅ Flow cards registered (+33 nouveaux)');
    
    // Register additional global flow cards
    this.registerFlowCards();

    this.log('✅ Universal Tuya Zigbee App has been initialized');
    
    // Log capability stats
    const stats = this.capabilityManager.getStats();
    this.log(`📊 Capabilities managed: ${stats.created}`);
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
