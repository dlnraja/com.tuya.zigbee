'use strict';

// v5.11.185: Suppress punycode DEP0040 deprecation from transitive deps
require('./lib/suppress-punycode');

// v5.8.25: Patch color-space module to fix Homey sandbox require('./rgb') error
try {
  const colorShim = require('./lib/shims/color-space-shim');
  require.cache[require.resolve('color-space/hsv')] = { exports: colorShim.hsv };
  require.cache[require.resolve('color-space/rgb')] = { exports: colorShim.rgb };
  require.cache[require.resolve('color-space/xyz')] = { exports: colorShim.xyz };
  require.cache[require.resolve('color-space/xyy')] = { exports: colorShim.xyy };
} catch (e) { /* Shim not critical if color-space works */ }

// v5.3.62: Prevent MaxListenersExceededWarning for apps with many devices
const { EventEmitter } = require('events');
EventEmitter.defaultMaxListeners = 50;

const Homey = require('homey');
const { registerCustomClusters } = require('./lib/zigbee/registerClusters');
const FlowCardManager = require('./lib/flow/FlowCardManager');
const UniversalFlowCardLoader = require('./lib/flow/UniversalFlowCardLoader');
const FeatureFlowCards = require('./lib/flow/FeatureFlowCards');
const CapabilityManager = require('./lib/utils/CapabilityManager');
const AdvancedAnalytics = require('./lib/analytics/AdvancedAnalytics');
const SmartDeviceDiscovery = require('./lib/discovery/SmartDeviceDiscovery');
const PerformanceOptimizer = require('./lib/performance/PerformanceOptimizer');
const UnknownDeviceHandler = require('./lib/helpers/UnknownDeviceHandler');
const SystemLogsCollector = require('./lib/diagnostics/SystemLogsCollector');
const DeviceIdentificationDatabase = require('./lib/helpers/DeviceIdentificationDatabase');
const DiagnosticAPI = require('./lib/diagnostics/DiagnosticAPI');
const { LogBuffer } = require('./lib/utils/LogBuffer');
const SuggestionEngine = require('./lib/smartadapt/SuggestionEngine');
const { processMigrationQueue } = require('./lib/utils/migration-queue');
const OTAUpdateManager = require('./lib/ota/OTAUpdateManager');
const QuirksDatabase = require('./lib/quirks/QuirksDatabase');
const EmergencyDeviceFix = require('./lib/emergency/EmergencyDeviceFix');

// v9.1.0: Feature modules for flow cards (SolarElevation, TransitionEngine, etc.)
const SolarElevation = require('./lib/features/SolarElevation');
const TransitionEngine = require('./lib/features/TransitionEngine');
const EnergyHistoryStore = require('./lib/features/EnergyHistoryStore');
const TariffCalculator = require('./lib/features/TariffCalculator');
const ScheduleManager = require('./lib/features/ScheduleManager');
const ConditionEngine = require('./lib/features/ConditionEngine');
const PredictiveHealthEngine = require('./lib/features/PredictiveHealthEngine');
const NetworkTopologyCollector = require('./lib/features/NetworkTopologyCollector');

let SourceCredits = {};
try {
  SourceCredits = require('./lib/data/SourceCredits');
} catch (_e) {
  SourceCredits = {
    contributors: [],
    licenses: { MIT: 'https://opensource.org/licenses/MIT' },
    attribution: 'Based on work by Johan Bendz and community contributors'
  };
}

const TuyaUDPDiscovery = require('./lib/tuya-local/TuyaUDPDiscovery');
const SessionManager = require('./lib/session/SessionManager');
const HealthMonitor = require('./lib/health/HealthMonitor');
const SanityFilter = require('./lib/filter/SanityFilter');

// v9.1.0: New feature modules (Ideas #41, #44, #86, #87, #96, #98, #99)
const DeviceGroupManager = require('./lib/groups/DeviceGroupManager');
const DeviceHealthDashboard = require('./lib/health/DeviceHealthDashboard');
const AutoDetectionPairingWizard = require('./lib/pairing/AutoDetectionPairingWizard');
const UserFriendlyErrors = require('./lib/errors/UserFriendlyErrors');
const { TestFramework } = require('./lib/testing');
const ConfigSchemaValidator = require('./lib/validation/ConfigSchemaValidator');
const CentralizedDPRegistry = require('./lib/registry/CentralizedDPRegistry');

class TuyaUnifiedZigbeeApp extends Homey.App {
  _flowCardsRegistered = false;
  flowCardManager = null;
  capabilityManager = null;
  analytics = null;
  discovery = null;
  optimizer = null;
  unknownHandler = null;
  systemLogsCollector = null;
  identificationDatabase = null;
  diagnosticAPI = null;
  logBuffer = null;
  suggestionEngine = null;
  otaManager = null;
  quirksDatabase = null;
  _tuyaUDPDiscovery = null;
  developerDebugMode = false;
  experimentalSmartAdapt = false;

  sessionManager = null;
  healthMonitor = null;
  sanityFilter = null;

  // v9.1.0: New feature managers (Ideas #41, #44, #86, #87, #96, #98, #99)
  groupManager = null;
  healthDashboard = null;
  pairingWizard = null;
  errorTranslator = null;
  configValidator = null;
  dpRegistry = null;

  // v9.1.0: Feature module instances for flow cards
  featureFlowCards = null;
  solarElevation = null;
  transitionEngine = null;
  energyHistoryStore = null;
  tariffCalculator = null;
  scheduleManager = null;
  conditionEngine = null;
  predictiveHealthEngine = null;
  networkTopologyCollector = null;

  async onInit() {
    this.initializeSettings();

    process.on('unhandledRejection', (reason, promise) => {
      try {
        this.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
      } catch (e) {
        console.error('Error logging unhandledRejection', e);
      }
    });

    if (this._flowCardsRegistered) {
      this.log('⏭️  Flow cards already registered');
      return;
    }
    this._flowCardsRegistered = true;

    this.log('Tuya Unified Zigbee App is initializing...');
    this.log(`📊 Mode: ${this.developerDebugMode ? 'DEVELOPER (verbose)' : 'PRODUCTION (minimal logs)'}`);
    this.log(`🤖 Smart-Adapt: ${this.experimentalSmartAdapt ? 'EXPERIMENTAL (modifies)' : 'READ-ONLY (safe)'}`);

    this.capabilityManager = new CapabilityManager(this.homey);
    this.log('✅ CapabilityManager initialized');

    this.identificationDatabase = new DeviceIdentificationDatabase(this.homey);
    try {
      await this.identificationDatabase.buildDatabase();
      this.log('✅ Intelligent Device Identification Database built');
    } catch (err) {
      this.error('⚠️ Device ID Database build failed (non-critical):', err.message);
    }

    try {
      registerCustomClusters(this);
      this.log('✅ Custom Zigbee clusters registered');
    } catch (err) {
      this.error('❌ Failed to register custom clusters:', err);
    }

    try {
      this.flowCardManager = new FlowCardManager(this.homey);
      this.flowCardManager.registerAll();
      this.log('✅ Flow cards registered');
    } catch (err) {
      this.error('⚠️ FlowCardManager failed (non-critical):', err.message);
    }

    try {
      this.universalFlowLoader = new UniversalFlowCardLoader(this.homey);
      await this.universalFlowLoader.initialize();
      this.log('✅ Universal Flow Card Loader initialized (sub-capabilities + DP)');
    } catch (err) {
      this.error('⚠️ Universal Flow Loader failed (non-critical):', err.message);
    }

    try {
      this.analytics = new AdvancedAnalytics(this.homey);
      await this.analytics.initialize();
      this.log('✅ Advanced Analytics initialized');
    } catch (err) {
      this.error('⚠️ Analytics failed (non-critical):', err.message);
    }

    try {
      this.discovery = new SmartDeviceDiscovery(this.homey);
      await this.discovery.initialize();
      this.log('✅ Smart Device Discovery initialized');
    } catch (err) {
      this.error('⚠️ Discovery failed (non-critical):', err.message);
    }

    try {
      this.optimizer = new PerformanceOptimizer({ maxCacheSize: 1000, maxCacheMemory: 10 * 1024 * 1024 });
      this.log('✅ Performance Optimizer initialized');
    } catch (err) { this.error('⚠️ Optimizer failed:', err.message); }

    try {
      this.unknownHandler = new UnknownDeviceHandler(this.homey);
      this.log('✅ Unknown Device Handler initialized');
    } catch (err) { this.error('⚠️ UnknownHandler failed:', err.message); }

    try {
      this.systemLogsCollector = new SystemLogsCollector(this.homey);
      this.log('✅ System Logs Collector initialized');
    } catch (err) { this.error('⚠️ SystemLogs failed:', err.message); }

    try {
      this.diagnosticAPI = new DiagnosticAPI(this);
      this.log('✅ Diagnostic API initialized (MCP-ready)');
    } catch (err) { this.error('⚠️ DiagnosticAPI failed:', err.message); }

    try {
      this.logBuffer = new LogBuffer(this.homey);
      this.log('✅ LogBuffer initialized (accessible via ManagerSettings)');
    } catch (err) { this.error('⚠️ LogBuffer failed:', err.message); }

    try {
      this.suggestionEngine = new SuggestionEngine(this.homey, this.logBuffer);
      this.log('✅ SuggestionEngine initialized (non-destructive mode)');
    } catch (err) { this.error('⚠️ SuggestionEngine failed:', err.message); }

    try {
      this.otaManager = new OTAUpdateManager(this.homey);
      this.log('✅ OTA Update Manager initialized');
      // Idea #42: Start automatic Z2M OTA firmware update discovery (6h interval)
      try {
        this.otaManager.startAutoDiscovery(6 * 60 * 60 * 1000);
        this.log('✅ OTA Auto-Discovery started (6h interval)');
      } catch (e) {
        this.log('⚠️ OTA Auto-Discovery failed to start (non-critical):', e.message);
      }
    } catch (err) { this.error('⚠️ OTA Manager failed:', err.message); }

    try {
      this.log(`📜 Data sources: ${SourceCredits.getAllSources().length} contributors credited`);
    } catch (err) { this.error('⚠️ SourceCredits failed:', err.message); }

    try {
      this.quirksDatabase = QuirksDatabase;
      this.log('✅ Quirks Database initialized');
    } catch (err) { this.error('⚠️ Quirks failed:', err.message); }

    try {
      this._tuyaUDPDiscovery = new TuyaUDPDiscovery({ log: this.log.bind(this) });

      const updateDeviceIP = async (info) => {
        try {
          const drivers = Object.values(this.homey.drivers.getDrivers());
          for (const driver of drivers) {
            const devices = driver.getDevices() || [];
            for (const device of devices) {
              const settings = device.getSettings();
              if (settings && settings.device_id === info.deviceId) {
                if (settings.ip_address !== info.ip) {
                  this.log(`🔄 [SMART-HEAL] IP change: ${settings.ip_address} -> ${info.ip}`);
                  await device.setSettings({ ip_address: info.ip }).catch(e => this.error('[SMART-HEAL] Settings update failed', e));
                }
              }
            }
          }
        } catch (err) {
          this.error('[SMART-HEAL] Error updating IP:', err.message);
        }
      };

      this._tuyaUDPDiscovery.on('device-updated', updateDeviceIP);
      this._tuyaUDPDiscovery.on('device-found', updateDeviceIP);
      await this._tuyaUDPDiscovery.start();
      this.log('✅ Tuya WiFi UDP Discovery started (ports 6666/6667/6668)');
    } catch (err) {
      this.log('⚠️ Tuya UDP Discovery failed (non-critical):', err.message);
    }

    try {
      this.sessionManager = new SessionManager();
      this.healthMonitor = new HealthMonitor(this.homey);
      this.sanityFilter = new SanityFilter({ maxDeviation: 0.60 });

      this.sanityFilter.on('discard', ({ deviceId, capability, value, fallback, reason }) => {
        if (this.developerDebugMode) {
          this.log(`🛡️ [SANITY] Discarded ${capability} spike: ${value} (Fallback: ${fallback}, Reason: ${reason}) for ${deviceId}`);
        }
      });

      this.healthMonitor.on('checkIn', ({ deviceId, status }) => {
        if (status === HealthMonitor.STATUS.DEAD || status === HealthMonitor.STATUS.SILENT) {
          this.log(`💓 [HEALTH] Device ${deviceId} is back online`);
        }
      });

      this.log('✅ L12-L14 Architectural Layers initialized');
    } catch (err) {
      this.error('❌ Failed to initialize architectural layers:', err.message);
    }

    // v9.1.0: Initialize new feature modules (Ideas #41, #44, #86, #87, #96, #98, #99)
    try {
      this.groupManager = new DeviceGroupManager(this.homey);
      await this.groupManager.initialize();
      this.log('✅ Device Group Manager initialized (Idea #41)');
    } catch (err) {
      this.error('⚠️ GroupManager failed (non-critical):', err.message);
    }

    try {
      this.healthDashboard = new DeviceHealthDashboard(this.homey, this.healthMonitor);
      this.log('✅ Device Health Dashboard initialized (Idea #44)');
    } catch (err) {
      this.error('⚠️ HealthDashboard failed (non-critical):', err.message);
    }

    try {
      this.pairingWizard = new AutoDetectionPairingWizard(this.homey);
      this.log('✅ Auto-Detection Pairing Wizard initialized (Idea #86)');
    } catch (err) {
      this.error('⚠️ PairingWizard failed (non-critical):', err.message);
    }

    try {
      this.errorTranslator = new UserFriendlyErrors();
      this.log('✅ User-Friendly Error Translator initialized (Idea #87)');
    } catch (err) {
      this.error('⚠️ ErrorTranslator failed (non-critical):', err.message);
    }

    try {
      this.configValidator = new ConfigSchemaValidator();
      this.log('✅ Config Schema Validator initialized (Idea #98)');
    } catch (err) {
      this.error('⚠️ ConfigValidator failed (non-critical):', err.message);
    }

    try {
      this.dpRegistry = new CentralizedDPRegistry();
      const stats = this.dpRegistry.getStats();
      this.log(`✅ Centralized DP Registry initialized (Idea #99): ${stats.totalDPs} DPs, ${Object.keys(stats.byDeviceType).length} device types`);
    } catch (err) {
      this.error('⚠️ DPRegistry failed (non-critical):', err.message);
    }

    try {
      this.homey.flow.getActionCard('ota_check_updates').registerRunListener(async (args) => {
        this.log('[OTA] Manual check initiated via Flow');
        if (!args.device) return false;
        try {
          const update = await this.otaManager?.checkUpdate(args.device);
          if (update?.available) {
            await this.homey.notifications.createNotification({
              excerpt: `OTA Update found for ${args.device.getName()} (v${update.newVersion}).`
            });
          } else {
            await this.homey.notifications.createNotification({
              excerpt: `Your device ${args.device.getName()} is on the latest firmware.`
            });
          }
          return true;
        } catch (err) {
          this.error('[OTA] Check failed:', err.message);
          return false;
        }
      });
      this.log('✅ Registered OTA Update Manual Check flow card');
    } catch (err) {
      this.error('⚠️ Could not register OTA check card:', err.message);
    }

    try {
      await this.initializeInsights();
    } catch (err) { this.error('⚠️ Insights failed:', err.message); }

    // v9.1.0: Virtual Presence Detection System (no dedicated sensor required)
    try {
      this._registerPresenceFlowCards();
      this.log('✅ Virtual Presence Detection flow cards registered');
    } catch (err) {
      this.error('⚠️ Presence flow cards failed (non-critical):', err.message);
    }

    // v9.1.0: Initialize feature modules and register their flow cards
    try {
      this.solarElevation = new SolarElevation({ homey: this.homey, logger: this.log.bind(this) });
      this.transitionEngine = new TransitionEngine();
      this.energyHistoryStore = new EnergyHistoryStore(this.homey);
      await this.energyHistoryStore.initialize();
      this.tariffCalculator = new TariffCalculator({ logger: this.log.bind(this) });
      this.scheduleManager = new ScheduleManager(this.homey);
      this.scheduleManager.start();
      this.conditionEngine = new ConditionEngine(this.homey);
      this.predictiveHealthEngine = new PredictiveHealthEngine(this.homey);
      this.predictiveHealthEngine.start();
      this.networkTopologyCollector = new NetworkTopologyCollector(this.homey);
      this.solarElevation.startObserving();

      // Register feature flow cards
      this.featureFlowCards = new FeatureFlowCards(this.homey);
      this.featureFlowCards.setSolarElevation(this.solarElevation);
      this.featureFlowCards.setTransitionEngine(this.transitionEngine);
      this.featureFlowCards.setEnergyHistoryStore(this.energyHistoryStore);
      this.featureFlowCards.setTariffCalculator(this.tariffCalculator);
      this.featureFlowCards.setScheduleManager(this.scheduleManager);
      this.featureFlowCards.setConditionEngine(this.conditionEngine);
      this.featureFlowCards.setPredictiveHealthEngine(this.predictiveHealthEngine);
      this.featureFlowCards.setNetworkTopologyCollector(this.networkTopologyCollector);
      this.featureFlowCards.registerAll();
      this.log('✅ Feature modules and flow cards initialized');
    } catch (err) {
      this.error('⚠️ Feature modules failed (non-critical):', err.message);
    }

    this.log('✅ Tuya Unified Zigbee App has been initialized');
    this._scanForPhantomDevices();
    this._clearMigrationQueue();
  }

  async _clearMigrationQueue() {
    try {
      await this.homey.settings.set('__migration_queue__', []);
    } catch (err) { /* non-critical */ }
  }

  async processMigrations() {
    try {
      this.log('[MIGRATION-WORKER] 🔄 Starting...');
      const processed = await processMigrationQueue(this.homey);
      this.log(`[MIGRATION-WORKER] ✅ Processed ${processed} migrations`);
      const fixResults = await EmergencyDeviceFix.runAll(this.homey);
      this.log(`[EMERGENCY-FIX] ✅ Fixed: migrations=${fixResults.migrationFixed}, devices=${fixResults.devicesFixed}`);
    } catch (err) {
      this.error('[MIGRATION-WORKER] ❌ Error:', err.message);
    }
  }

  async _scanForPhantomDevices() {
    try {
      this.log('[PHANTOM-SCAN] 🔍 Scanning for phantom sub-devices...');
      const drivers = this.homey.drivers.getDrivers();
      let phantomCount = 0;
      let realCount = 0;
      const noSubDeviceDrivers = [
        'climate_sensor', 'motion_sensor', 'contact_sensor', 'water_leak_sensor',
        'smoke_sensor', 'gas_sensor', 'co_sensor', 'plug_smart', 'plug_energy_monitor',
        'bulb_dimmable', 'bulb_rgb', 'bulb_rgbw', 'bulb_white', 'bulb_tunable_white',
        'led_strip', 'radiator_valve', 'thermostat'
      ];
      for (const driver of Object.values(drivers)) {
        const driverId = driver.id || '';
        const devices = driver.getDevices() || [];
        for (const device of devices) {
          try {
            const data = device.getData?.() || {};
            const hasSubDeviceId = data.subDeviceId !== undefined;
            const isNoSubDeviceDriver = noSubDeviceDrivers.some(d => driverId.includes(d));
            if (hasSubDeviceId && isNoSubDeviceDriver) {
              phantomCount++;
              if (typeof device.setUnavailable === 'function') {
                device.setUnavailable('⚠️ Phantom device. Delete manually.').catch(() => {});
              }
            } else {
              realCount++;
            }
          } catch (err) { /* skip */ }
        }
      }
      if (phantomCount > 0) {
        this.log(`[PHANTOM-SCAN] ⚠️ Found ${phantomCount} phantom devices - marked unavailable`);
      } else {
        this.log(`[PHANTOM-SCAN] ✅ No phantom devices (${realCount} OK)`);
      }
    } catch (err) { this.error('[PHANTOM-SCAN] Error:', err.message); }
  }

  async onDiagnostic() {
    this.log('📊 Generating diagnostic report...');
    try {
      const systemLogsReport = await this.systemLogsCollector.formatForDiagnosticReport();
      const report = [
        '═══════════════════════════════════════════════',
        '📊 UNIVERSAL TUYA ZIGBEE - DIAGNOSTIC REPORT',
        '═══════════════════════════════════════════════',
        `Generated: ${new Date().toISOString()}`,
        `App: ${this.homey.manifest.id} v${this.homey.manifest.version}`,
        systemLogsReport,
        '═══════════════════════════════════════════════'
      ].join('\n');
      return report;
    } catch (err) {
      return `Error generating diagnostic report: ${err.message}`;
    }
  }

  getOTAManager() { return this.otaManager; }
  getQuirksDatabase() { return this.quirksDatabase; }

  // v9.1.0: Getters for new feature modules (Ideas #41, #44, #86, #87, #98, #99)
  getGroupManager() { return this.groupManager; }
  getHealthDashboard() { return this.healthDashboard; }
  getPairingWizard() { return this.pairingWizard; }
  getErrorTranslator() { return this.errorTranslator; }
  getConfigValidator() { return this.configValidator; }
  getDPRegistry() { return this.dpRegistry; }

  /**
   * v9.1.0: Register app-level flow card listeners for Virtual Presence Detection.
   * These complement the driver-level listeners in PresenceDetectorDriver.
   */
  _registerPresenceFlowCards() {
    // Condition: Any room is occupied
    this.homey.flow.getConditionCard('virtual_presence_any_room_occupied')
      .registerRunListener(async (args) => {
        try {
          const driver = this.homey.drivers.getDriver('presence_detector');
          if (!driver) return false;
          const devices = driver.getDevices() || [];
          return devices.some(d => typeof d.isPresent === 'function' && d.isPresent());
        } catch (err) {
          return false;
        }
      });

    // Action: Force clear ALL rooms
    this.homey.flow.getActionCard('virtual_presence_force_clear_all')
      .registerRunListener(async () => {
        try {
          const driver = this.homey.drivers.getDriver('presence_detector');
          if (!driver) return false;
          const devices = driver.getDevices() || [];
          for (const device of devices) {
            if (typeof device.forceClear === 'function') {
              await device.forceClear();
            }
          }
          return true;
        } catch (err) {
          this.error('[PRESENCE] Force clear all failed:', err.message);
          return false;
        }
      });
  }

  async initializeInsights() {
    this.log('📊 Initializing Homey Insights...');
    try {
      await this.homey.insights.createLog('battery_health', { title: { en: 'Battery Health' }, type: 'number', units: '%', decimals: 0 }).catch(() => {});
      await this.homey.insights.createLog('device_uptime', { title: { en: 'Device Uptime' }, type: 'number', units: '%', decimals: 1 }).catch(() => {});
      await this.homey.insights.createLog('zigbee_lqi', { title: { en: 'Zigbee Link Quality' }, type: 'number', units: '', decimals: 0 }).catch(() => {});
      await this.homey.insights.createLog('command_success_rate', { title: { en: 'Command Success Rate' }, type: 'number', units: '%', decimals: 1 }).catch(() => {});
      await this.homey.insights.createLog('ota_updates', { title: { en: 'OTA Updates Available' }, type: 'number', units: '', decimals: 0 }).catch(() => {});
      await this.homey.insights.createLog('devices_offline', { title: { en: 'Devices Offline' }, type: 'number', units: '', decimals: 0 }).catch(() => {});
      this.log('✅ Homey Insights initialized (6 logs)');
    } catch (err) {
      this.error('⚠️ Error initializing insights:', err.message);
    }
  }

  initializeSettings() {
    this.developerDebugMode = this.homey.settings.get('developer_debug_mode') ?? false;
    this.experimentalSmartAdapt = this.homey.settings.get('experimental_smart_adapt') ?? false;
    this.homey.settings.on('set', (key) => {
      if (key === 'developer_debug_mode') {
        this.developerDebugMode = this.homey.settings.get('developer_debug_mode');
      }
      if (key === 'experimental_smart_adapt') {
        this.experimentalSmartAdapt = this.homey.settings.get('experimental_smart_adapt');
      }
    });
  }

  async onUninit() {
    this._destroyed = true;
    this.log('⚠️ App uninitializing...');
    try { if (this._tuyaUDPDiscovery) { await this._tuyaUDPDiscovery.stop(); this._tuyaUDPDiscovery = null; } } catch (e) {}
    try { if (this.analytics?.destroy) { this.analytics.destroy(); this.analytics = null; } } catch (e) {}
    try { if (this.healthMonitor?.destroy) { this.healthMonitor.destroy(); this.healthMonitor = null; } } catch (e) {}
    try { if (this.discovery?.stop) { await this.discovery.stop(); this.discovery = null; } } catch (e) {}

    // v9.1.0: Cleanup new feature modules
    try { if (this.groupManager?.destroy) { this.groupManager.destroy(); this.groupManager = null; } } catch (e) {}
    try { if (this.healthDashboard?.destroy) { this.healthDashboard.destroy(); this.healthDashboard = null; } } catch (e) {}
    this.pairingWizard = null;
    this.errorTranslator = null;
    this.configValidator = null;
    this.dpRegistry = null;

    // v9.1.0: Cleanup feature flow cards and modules
    try { if (this.featureFlowCards?.destroy) { this.featureFlowCards.destroy(); } } catch (e) {}
    try { if (this.solarElevation?.destroy) { this.solarElevation.destroy(); } } catch (e) {}
    try { if (this.transitionEngine?.destroy) { this.transitionEngine.destroy(); } } catch (e) {}
    try { if (this.energyHistoryStore?.destroy) { this.energyHistoryStore.destroy(); } } catch (e) {}
    try { if (this.tariffCalculator?.destroy) { this.tariffCalculator.destroy(); } } catch (e) {}
    try { if (this.scheduleManager?.destroy) { this.scheduleManager.destroy(); } } catch (e) {}
    try { if (this.conditionEngine?.destroy) { this.conditionEngine.destroy(); } } catch (e) {}
    try { if (this.predictiveHealthEngine?.destroy) { this.predictiveHealthEngine.destroy(); } } catch (e) {}
    try { if (this.networkTopologyCollector?.destroy) { this.networkTopologyCollector.destroy(); } } catch (e) {}
    this.featureFlowCards = null;
    this.solarElevation = null;
    this.transitionEngine = null;
    this.energyHistoryStore = null;
    this.tariffCalculator = null;
    this.scheduleManager = null;
    this.conditionEngine = null;
    this.predictiveHealthEngine = null;
    this.networkTopologyCollector = null;

    this.flowCardManager = null;
    this.capabilityManager = null;
    this.optimizer = null;
    this.unknownHandler = null;
    this.systemLogsCollector = null;
    this.identificationDatabase = null;
    this.diagnosticAPI = null;
    this.logBuffer = null;
    this.suggestionEngine = null;
    try { if (this.otaManager?.cleanup) { this.otaManager.cleanup(); } } catch (e) {}
    this.otaManager = null;
    this.quirksDatabase = null;
    this.sessionManager = null;
    this.sanityFilter = null;
    this.log('✅ App uninit complete');
    try { await super.onUninit(); } catch (e) {}
  }
}

module.exports = TuyaUnifiedZigbeeApp;
