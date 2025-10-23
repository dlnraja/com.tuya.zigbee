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
   */
  registerFlowCards() {
    this.log('📋 Registering global flow cards...');

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

    // Condition: Check if battery powered
    this.homey.flow.getConditionCard('is_battery_powered')
      .registerRunListener(async (args, state) => {
        const device = args.device;
        return device.isBatteryPowered && device.isBatteryPowered();
      });

    // Condition: Check if AC powered
    this.homey.flow.getConditionCard('is_ac_powered')
      .registerRunListener(async (args, state) => {
        const device = args.device;
        return device.isACPowered && device.isACPowered();
      });

    // Action: Request battery update
    this.homey.flow.getActionCard('request_battery_update')
      .registerRunListener(async (args, state) => {
        const device = args.device;
        
        if (!device.requestBatteryUpdate) {
          throw new Error('Device does not support battery update');
        }
        
        await device.requestBatteryUpdate();
        return true;
      });

    // Action: Set energy mode
    this.homey.flow.getActionCard('set_energy_mode')
      .registerRunListener(async (args, state) => {
        const device = args.device;
        const mode = args.mode;
        
        if (!device.applyEnergyOptimization) {
          throw new Error('Device does not support energy optimization');
        }
        
        await device.applyEnergyOptimization(mode);
        return true;
      });

    this.log('✅ Global flow cards registered');
  }

}

module.exports = UniversalTuyaZigbeeApp;
