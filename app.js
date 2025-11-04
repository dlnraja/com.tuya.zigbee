'use strict';

const Homey = require('homey');
const { registerCustomClusters } = require('./lib/registerClusters');
const FlowCardManager = require('./lib/FlowCardManager');
const CapabilityManager = require('./lib/utils/CapabilityManager');
const AdvancedAnalytics = require('./lib/analytics/AdvancedAnalytics');
const SmartDeviceDiscovery = require('./lib/discovery/SmartDeviceDiscovery');
const PerformanceOptimizer = require('./lib/performance/PerformanceOptimizer');

class UniversalTuyaZigbeeApp extends Homey.App {
  _flowCardsRegistered = false;
  flowCardManager = null;
  capabilityManager = null;
  analytics = null;
  discovery = null;
  optimizer = null;


  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    // PATCH 5: Global unhandledRejection handler to prevent cascade crashes
    process.on('unhandledRejection', (reason, promise) => {
      try {
        this.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
        // Log but don't crash the entire app
      } catch (e) {
        console.error('Error logging unhandledRejection', e);
      }
    });

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
    
    // Initialize Advanced Analytics
    this.analytics = new AdvancedAnalytics(this.homey);
    await this.analytics.initialize();
    this.log('✅ Advanced Analytics initialized');
    
    // Initialize Smart Device Discovery
    this.discovery = new SmartDeviceDiscovery(this.homey);
    await this.discovery.initialize();
    this.log('✅ Smart Device Discovery initialized');
    
    // Initialize Performance Optimizer
    this.optimizer = new PerformanceOptimizer({
      maxCacheSize: 1000,
      maxCacheMemory: 10 * 1024 * 1024 // 10 MB
    });
    this.log('✅ Performance Optimizer initialized');
    
    // Register additional global flow cards
    this.registerFlowCards();
    
    // Initialize Homey Insights
    await this.initializeInsights();

    this.log('✅ Universal Tuya Zigbee App has been initialized');
    this.log('🚀 Advanced systems: Analytics, Discovery, Performance Optimization');
    
    // Log capability stats
    const stats = this.capabilityManager.getStats();
    this.log(`📊 Capabilities managed: ${stats.created}`);
  }

  /**
   * Register Homey Native Flow Cards
   * Implements all native Homey SDK3 flow functionality
   */
  registerFlowCards() {
    this.log('📋 Registering Homey Native Flow Cards...');

    try {
      // CONDITION: Device is online/offline
      this.homey.flow.getConditionCard('is_online')
        .registerRunListener(async (args) => {
          return args.device.getAvailable();
        });
      
      // CONDITION: Battery below threshold
      this.homey.flow.getConditionCard('battery_below')
        .registerRunListener(async (args) => {
          if (!args.device.hasCapability('measure_battery')) {
            return false;
          }
          const batteryLevel = args.device.getCapabilityValue('measure_battery');
          return batteryLevel < args.percentage;
        });
      
      // ACTION: Identify device (blink/beep)
      this.homey.flow.getActionCard('identify_device')
        .registerRunListener(async (args) => {
          if (typeof args.device.identify === 'function') {
            await args.device.identify();
          } else {
            // Fallback: toggle device quickly
            if (args.device.hasCapability('onoff')) {
              const original = args.device.getCapabilityValue('onoff');
              await args.device.setCapabilityValue('onoff', !original);
              await new Promise(resolve => setTimeout(resolve, 500));
              await args.device.setCapabilityValue('onoff', original);
            }
          }
        });
      
      // ACTION: Check firmware updates
      this.homey.flow.getActionCard('check_firmware_update')
        .registerRunListener(async (args) => {
          if (typeof args.device.checkFirmwareUpdate === 'function') {
            await args.device.checkFirmwareUpdate();
          }
        });
      
      // ACTION: Reset device to defaults
      this.homey.flow.getActionCard('reset_device')
        .registerRunListener(async (args) => {
          if (typeof args.device.resetDevice === 'function') {
            await args.device.resetDevice();
          }
        });

      this.log('✅ Homey Native Flow Cards registered (5 cards)');
    } catch (err) {
      this.error('⚠️  Error registering flow cards:', err.message);
      // Don't crash the app if flow cards fail to register
    }
  }
  
  /**
   * Initialize Homey Insights
   */
  async initializeInsights() {
    this.log('📊 Initializing Homey Insights...');
    
    try {
      // Battery health insight
      await this.homey.insights.createLog('battery_health', {
        title: { en: 'Battery Health', fr: 'Santé Batterie' },
        type: 'number',
        units: '%',
        decimals: 0
      }).catch(() => {}); // Already exists
      
      // Device uptime insight
      await this.homey.insights.createLog('device_uptime', {
        title: { en: 'Device Uptime', fr: 'Disponibilité' },
        type: 'number',
        units: '%',
        decimals: 1
      }).catch(() => {});
      
      // Zigbee LQI insight
      await this.homey.insights.createLog('zigbee_lqi', {
        title: { en: 'Zigbee Link Quality', fr: 'Qualité Lien Zigbee' },
        type: 'number',
        units: '',
        decimals: 0
      }).catch(() => {});
      
      // Command success rate insight
      await this.homey.insights.createLog('command_success_rate', {
        title: { en: 'Command Success Rate', fr: 'Taux Succès Commandes' },
        type: 'number',
        units: '%',
        decimals: 1
      }).catch(() => {});
      
      this.log('✅ Homey Insights initialized (4 logs)');
    } catch (err) {
      this.error('⚠️  Error initializing insights:', err.message);
    }
  }

}

module.exports = UniversalTuyaZigbeeApp;
