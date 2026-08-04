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
require('./lib/drivers/ZigBeeDriverFlowCardPatch');
const { registerCustomClusters } = require('./lib/zigbee/registerClusters');
const FlowCardManager = require('./lib/flow/FlowCardManager');
const UniversalFlowCardLoader = require('./lib/flow/UniversalFlowCardLoader');
const FeatureFlowCards = require('./lib/flow/FeatureFlowCards');

// v9.0.240 (P58): Install safeSetCapabilityValue + smartCap mixin globally on
// every ZigBeeDevice subclass (Universal, Tuya, Light, Specific, ...).
// Doing it at app-load ensures the method is on the prototype before any driver
// instance is constructed.
try {
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  const { installSafeCapabilityMixin } = require('./lib/utils/SafeCapability');
  const SmartCapability = require('./lib/data/SmartCapability');
  installSafeCapabilityMixin(ZigBeeDevice);
  SmartCapability.installSmartCapMixin(ZigBeeDevice);
} catch (e) {
  // Best-effort — mixin is additive, missing it is non-fatal
}

// v9.0.249 (P59): Install getManufacturerName() globally on ZigBeeDevice.
// Forum crash reference (topic 140352):
//   - #2044 "this.getManufacturerName is not a function" (presence radar)
//   - #2045 dlnraja v8.1.5 fix
//   - #2033 #2046 multiple users with presence-sensor crashes
// Drivers historically used `MfrHelper.getManufacturerName(this)` (a free
// function). A few wrote `this.getManufacturerName()` thinking it was a method.
// Patching the prototype covers all 431 drivers at once.
try {
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  const { installManufacturerNameAccessor } = require('./lib/utils/ManufacturerNameAccessor');
  installManufacturerNameAccessor(ZigBeeDevice);
} catch (e) {
  // Best-effort — additive, missing it falls back to helper import
}

// v9.0.253 (P62): Install safeSetTimeout() globally on ZigBeeDevice.
// Gmail crash analysis (2026-07-15): 89x "Cannot read properties of
// undefined (reading 'setTimeout')" + 48x "...reading '_destroyed'".
// Root cause: `this.homey.setTimeout(...)` where this.homey is
// undefined. Patching the prototype with safe wrappers covers all
// 431 drivers in one shot. Existing lib/utils/safe-timers.js is
// re-used.
try {
  const { ZigBeeDevice } = require('homey-zigbeedriver');
  const { installSafeTimerAccessor } = require('./lib/utils/SafeTimerAccessor');
  installSafeTimerAccessor(ZigBeeDevice);
} catch (e) {
  // Best-effort — additive
}
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

    // v9.0.376: Hue-style smart features (motion lighting, circadian, wake-up)
    try {
      this._registerHueStyleFlowCards();
      this.log('✅ Hue-style flow cards registered');
    } catch (err) {
      this.error('⚠️ Hue-style flow cards failed (non-critical):', err.message);
    }

    // v9.0.378: OTA flow cards (condition + discovery action)
    try {
      this._registerOtaFlowCards();
      this.log('✅ OTA flow cards registered');
    } catch (err) {
      this.error('⚠️ OTA flow cards failed (non-critical):', err.message);
    }

    // v9.1.0: Initialize feature modules and register their flow cards
    try {
      this.solarElevation = new SolarElevation({ homey: this.homey, logger: this.log.bind(this) });
      this.transitionEngine = new TransitionEngine({ homey: this.homey });
      this.energyHistoryStore = new EnergyHistoryStore(this.homey);
      await this.energyHistoryStore.initialize();
      this.tariffCalculator = new TariffCalculator({ logger: this.log.bind(this) });
      this.scheduleManager = new ScheduleManager(this.homey);
      this.scheduleManager.start();
      this.conditionEngine = new ConditionEngine(this.homey);
      this.predictiveHealthEngine = new PredictiveHealthEngine(this.homey);
      this.predictiveHealthEngine.start();

      // v10.12.0 (P92.77): live data updates from our own GitHub Pages feed —
      // new fingerprints land in the app daily without an app update.
      try {
        const LiveDataUpdater = require('./lib/dynamic/LiveDataUpdater');
        this.liveDataUpdater = new LiveDataUpdater(this.homey, this.log.bind(this));
        await this.liveDataUpdater.start();
        const FingerprintMatcher = require('./lib/utils/fingerprint-matcher');
        FingerprintMatcher.setOverlayProvider(() => this.liveDataUpdater?.getOverlay?.() || null);
        this.log('✅ LiveDataUpdater started (gh-pages feed, 24h cycle)');
      } catch (err) {
        this.error('⚠️ LiveDataUpdater failed (non-critical, local data only):', err.message);
      }
      this.networkTopologyCollector = new NetworkTopologyCollector(this.homey);
      this.solarElevation.startObserving();

      // v9.0.401 (P92.104): availability monitoring (z2m-style, passive)
      const DeviceAvailabilityManager = require('./lib/managers/DeviceAvailabilityManager');
      this.availabilityManager = new DeviceAvailabilityManager(this.homey, {
        logger: (...a) => this.log(...a),
      });
      for (const driver of Object.values(this.homey.drivers.getDrivers())) {
        for (const device of driver.getDevices()) {
          this.availabilityManager.registerDevice(device);
        }
      }
      this.availabilityManager.start();
      // Late-paired devices are registered when their driver adds them
      this.homey.on('device.create', (device) => this.availabilityManager.registerDevice(device));

      // v9.0.402 (P92.105): sensor suppression manager (Hue-style mute)
      const SensorSuppressionManager = require('./lib/managers/SensorSuppressionManager');
      this.sensorSuppressionManager = new SensorSuppressionManager(this.homey, {
        logger: (...a) => this.log(...a),
      });

      // v9.0.403 (P92.106): presence simulation (Tuya random timing / Hue mimicking)
      const PresenceSimulationManager = require('./lib/managers/PresenceSimulationManager');
      this.presenceSimulationManager = new PresenceSimulationManager(this.homey, {
        logger: (...a) => this.log(...a),
      });

      // v9.0.407 (P92.109): feature fallback router (native→DP→software, tous drivers)
      const FeatureFallbackRouter = require('./lib/managers/FeatureFallbackRouter');
      this.featureFallbackRouter = new FeatureFallbackRouter(this.homey, {
        logger: (...a) => this.log(...a),
      });

      // v9.0.408 (P92.110): circadian solar engine + motion cascade (path lighting)
      const CircadianEngine = require('./lib/managers/CircadianEngine');
      this.circadianEngine = new CircadianEngine(this.homey, {
        solarElevation: this.solarElevation,
        logger: (...a) => this.log(...a),
      });
      const MotionCascadeManager = require('./lib/managers/MotionCascadeManager');
      this.motionCascadeManager = new MotionCascadeManager(this.homey, {
        logger: (...a) => this.log(...a),
      });

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
      this.featureFlowCards.setAvailabilityManager(this.availabilityManager);
      this.featureFlowCards.setSensorSuppressionManager(this.sensorSuppressionManager);
      this.featureFlowCards.setPresenceSimulationManager(this.presenceSimulationManager);
      this.featureFlowCards.setFeatureFallbackRouter(this.featureFallbackRouter);
      this.featureFlowCards.setCircadianEngine(this.circadianEngine);
      this.featureFlowCards.setMotionCascadeManager(this.motionCascadeManager);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // v9.0.376: HUE-STYLE SMART FEATURES (Zigbee/Tuya overlay via flow cards)
  // Motion-activated lighting, circadian curve, wake-up sunrise simulation.
  // ═══════════════════════════════════════════════════════════════════════════

  async _hueSetLight(light, { onoff, dim, temperature } = {}) {
    const set = async (cap, value) => {
      if (value === undefined || !light.hasCapability?.(cap)) {return;}
      const safe = light.safeSetCapabilityValue?.bind(light);
      if (safe) {await safe(cap, value).catch(() => {});}
      else {await light.setCapabilityValue?.(cap, value).catch(() => {});}
    };
    if (onoff !== undefined) {await set('onoff', onoff);}
    if (dim !== undefined) {await set('dim', dim);}
    if (temperature !== undefined) {await set('light_temperature', temperature);}
  }

  _hueCircadianCurve(date = new Date()) {
    // light_temperature Homey: 0 = froid (6500K), 1 = chaud (2200K)
    // v10.7.0: delegate to REAL solar elevation when available (the 4
    // parallel circadian curves in the repo were all time-based guesses;
    // SolarElevation computes the actual sun position). Time buckets stay
    // as fallback when the solar engine isn't initialized.
    const solar = this.solarElevation;
    if (solar && typeof solar.getElevation === 'function') {
      try {
        const elev = solar.getElevation(date); // degrés, <0 = nuit
        if (typeof elev === 'number' && Number.isFinite(elev)) {
          // Map élévation → dim/temp: nuit (<-6°) → très chaud/sombre,
          // crépuscule (-6..6°) → transition, jour (>30°) → froid/lumineux.
          const clamp01 = (x) => Math.max(0, Math.min(1, x));
          const dayness = clamp01((elev + 6) / 36); // -6° → 0, 30° → 1
          return {
            dim: Math.round((0.1 + dayness * 0.9) * 100) / 100,
            temperature: Math.round((1.0 - dayness * 0.85) * 100) / 100
          };
        }
      } catch { /* fall through to time buckets */ }
    }
    const h = date.getHours() + date.getMinutes() / 60;
    if (h < 5) {return { dim: 0.1, temperature: 1.0 };}
    if (h < 7) {return { dim: 0.3, temperature: 0.85 };}
    if (h < 9) {return { dim: 0.6, temperature: 0.6 };}
    if (h < 12) {return { dim: 0.9, temperature: 0.3 };}
    if (h < 15) {return { dim: 1.0, temperature: 0.15 };}
    if (h < 18) {return { dim: 0.85, temperature: 0.35 };}
    if (h < 20) {return { dim: 0.6, temperature: 0.65 };}
    if (h < 22) {return { dim: 0.35, temperature: 0.9 };}
    return { dim: 0.15, temperature: 1.0 };
  }

  _registerHueStyleFlowCards() {
    // ── Éclairage activé par mouvement ───────────────────────────────────────
    this.homey.flow.getActionCard('hue_motion_lighting')
      .registerRunListener(async (args) => {
        const { motion_sensor: sensor, light, brightness = 80, timeout = 5, lux_threshold = 0, quiet_start, quiet_end } = args;
        if (!sensor || !light) {return false;}

        // Fenêtre heures calmes (DND) : "22:00"-"07:00" traverse minuit
        if (quiet_start && quiet_end && /^\d{1,2}:\d{2}$/.test(quiet_start) && /^\d{1,2}:\d{2}$/.test(quiet_end)) {
          const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
          const now = new Date().getHours() * 60 + new Date().getMinutes();
          const qs = toMin(quiet_start), qe = toMin(quiet_end);
          const inQuiet = qs <= qe ? (now >= qs && now < qe) : (now >= qs || now < qe);
          if (inQuiet) {
            this.log(`[HUE] Motion ignoré: heures calmes ${quiet_start}-${quiet_end}`);
            return false;
          }
        }

        if (lux_threshold > 0 && sensor.hasCapability?.('measure_luminance')) {
          const lux = sensor.getCapabilityValue?.('measure_luminance');
          if (typeof lux === 'number' && lux >= lux_threshold) {
            this.log(`[HUE] Motion ignoré: lux ${lux} >= ${lux_threshold}`);
            return false;
          }
        }
        if (sensor.hasCapability?.('alarm_motion')) {
          const motion = sensor.getCapabilityValue?.('alarm_motion');
          if (motion === false) {return false;}
        }

        await this._hueSetLight(light, { onoff: true, dim: Math.max(1, Math.min(100, brightness)) / 100 });
        this.log(`[HUE] Motion lighting: ${light.getName?.()} ON à ${brightness}%`);

        this.homey.clearTimeout?.(light._hueMotionTimer);
        light._hueMotionTimer = this.homey.setTimeout(async () => {
          await this._hueSetLight(light, { onoff: false });
          this.log(`[HUE] Motion lighting: ${light.getName?.()} OFF après ${timeout} min`);
        }, Math.max(1, timeout) * 60 * 1000);
        return true;
      });

    // ── Éclairage circadien ──────────────────────────────────────────────────
    this.homey.flow.getActionCard('hue_circadian_apply')
      .registerRunListener(async (args) => {
        const { light } = args;
        if (!light) {return false;}
        const curve = this._hueCircadianCurve();
        await this._hueSetLight(light, { onoff: true, dim: curve.dim, temperature: curve.temperature });
        this.log(`[HUE] Circadien appliqué à ${light.getName?.()}: dim=${curve.dim} temp=${curve.temperature}`);
        return true;
      });

    // ── Routine réveil (simulation d'aube) ───────────────────────────────────
    this.homey.flow.getActionCard('hue_wakeup')
      .registerRunListener(async (args) => {
        const { light, ramp_minutes: duration = 15, target = 100 } = args;
        if (!light) {return false;}
        const steps = Math.max(5, Math.min(30, duration));
        const stepMs = (duration * 60 * 1000) / steps;
        const targetDim = Math.max(10, Math.min(100, target)) / 100;
        this.homey.clearInterval?.(light._hueWakeupTimer);
        let step = 0;
        await this._hueSetLight(light, { onoff: true, dim: 0.01 });
        light._hueWakeupTimer = this.homey.setInterval(async () => {
          step++;
          const dim = Math.min(targetDim, 0.01 + (targetDim - 0.01) * (step / steps));
          await this._hueSetLight(light, { dim: Math.round(dim * 100) / 100 });
          if (step >= steps) {
            this.homey.clearInterval?.(light._hueWakeupTimer);
            light._hueWakeupTimer = null;
            this.log(`[HUE] Réveil terminé sur ${light.getName?.()}: ${targetDim * 100}%`);
          }
        }, stepMs);
        this.log(`[HUE] Réveil démarré sur ${light.getName?.()}: ${steps} pas × ${Math.round(stepMs / 1000)}s`);
        return true;
      });

    // ── Routine coucher (simulation de crépuscule) ───────────────────────────
    this.homey.flow.getActionCard('hue_sleep')
      .registerRunListener(async (args) => {
        const { light, ramp_minutes: duration = 15 } = args;
        if (!light) {return false;}
        const current = light.getCapabilityValue?.('dim');
        const startDim = typeof current === 'number' && current > 0 ? current : 1;
        const steps = Math.max(5, Math.min(30, duration));
        const stepMs = (duration * 60 * 1000) / steps;
        this.homey.clearInterval?.(light._hueWakeupTimer);
        let step = 0;
        light._hueWakeupTimer = this.homey.setInterval(async () => {
          step++;
          const dim = Math.max(0.01, startDim * (1 - step / steps));
          await this._hueSetLight(light, { dim: Math.round(dim * 100) / 100 });
          if (step >= steps) {
            this.homey.clearInterval?.(light._hueWakeupTimer);
            light._hueWakeupTimer = null;
            await this._hueSetLight(light, { onoff: false });
            this.log(`[HUE] Coucher terminé sur ${light.getName?.()}: OFF`);
          }
        }, stepMs);
        this.log(`[HUE] Coucher démarré sur ${light.getName?.()}: ${steps} pas × ${Math.round(stepMs / 1000)}s`);
        return true;
      });

    // ── Scènes : capture / application (style Hue) ───────────────────────────
    this.homey.flow.getActionCard('scene_capture')
      .registerRunListener(async (args) => {
        const { light, slot = 1 } = args;
        if (!light) {return false;}
        const scene = {
          onoff: light.getCapabilityValue?.('onoff'),
          dim: light.getCapabilityValue?.('dim'),
          temperature: light.getCapabilityValue?.('light_temperature'),
          capturedAt: Date.now(),
        };
        await light.setStoreValue?.(`hue_scene_${slot}`, scene).catch(() => {});
        this.log(`[HUE] Scène ${slot} capturée pour ${light.getName?.()}: ${JSON.stringify(scene)}`);
        return true;
      });

    this.homey.flow.getActionCard('scene_apply')
      .registerRunListener(async (args) => {
        const { light, slot = 1 } = args;
        if (!light) {return false;}
        const scene = await light.getStoreValue?.(`hue_scene_${slot}`);
        if (!scene) {
          this.log(`[HUE] Slot ${slot} vide pour ${light.getName?.()}`);
          return false;
        }
        await this._hueSetLight(light, {
          onoff: scene.onoff !== false,
          dim: scene.dim,
          temperature: scene.temperature,
        });
        this.log(`[HUE] Scène ${slot} appliquée à ${light.getName?.()}`);
        return true;
      });

    // ── Fondu vers un niveau (style Lutron) ──────────────────────────────────
    this.homey.flow.getActionCard('dim_to_level')
      .registerRunListener(async (args) => {
        const { light, target = 50, ramp_minutes: duration = 5 } = args;
        if (!light) {return false;}
        const targetDim = Math.max(0, Math.min(100, target)) / 100;
        const current = light.getCapabilityValue?.('dim');
        const startDim = typeof current === 'number' && current >= 0 ? current : 0;
        if (duration <= 0) {
          await this._hueSetLight(light, { onoff: targetDim > 0, dim: targetDim });
          return true;
        }
        const steps = Math.max(5, Math.min(30, Math.ceil(duration * 2)));
        const stepMs = (duration * 60 * 1000) / steps;
        this.homey.clearInterval?.(light._hueWakeupTimer);
        let step = 0;
        if (targetDim > 0 && startDim === 0) {await this._hueSetLight(light, { onoff: true, dim: 0.01 });}
        light._hueWakeupTimer = this.homey.setInterval(async () => {
          step++;
          const dim = startDim + (targetDim - startDim) * (step / steps);
          await this._hueSetLight(light, { dim: Math.round(Math.max(0.01, dim) * 100) / 100 });
          if (step >= steps) {
            this.homey.clearInterval?.(light._hueWakeupTimer);
            light._hueWakeupTimer = null;
            if (targetDim === 0) {await this._hueSetLight(light, { onoff: false });}
            this.log(`[HUE] Fondu terminé sur ${light.getName?.()}: ${targetDim * 100}%`);
          }
        }, stepMs);
        return true;
      });

    // ── Cycle de scènes (style bouton raccourci IKEA) ────────────────────────
    this.homey.flow.getActionCard('scene_cycle')
      .registerRunListener(async (args) => {
        const { light, slots = 3 } = args;
        if (!light) {return false;}
        const count = Math.max(1, Math.min(5, slots));
        const current = (await light.getStoreValue?.('hue_scene_cycle_pos')) || 0;
        const next = (current % count) + 1;
        const scene = await light.getStoreValue?.(`hue_scene_${next}`);
        await light.setStoreValue?.('hue_scene_cycle_pos', next).catch(() => {});
        if (!scene) {
          this.log(`[HUE] Cycle: slot ${next} vide pour ${light.getName?.()}`);
          return false;
        }
        await this._hueSetLight(light, {
          onoff: scene.onoff !== false,
          dim: scene.dim,
          temperature: scene.temperature,
        });
        this.log(`[HUE] Cycle: scène ${next}/${count} appliquée à ${light.getName?.()}`);
        return true;
      });

    // ── Volets : position précise (style stores IKEA) ────────────────────────
    this.homey.flow.getActionCard('cover_set_position')
      .registerRunListener(async (args) => {
        const { cover, position = 50 } = args;
        if (!cover) {return false;}
        const target = Math.max(0, Math.min(100, position)) / 100;
        const set = cover.safeSetCapabilityValue?.bind(cover);
        if (cover.hasCapability?.('windowcoverings_set')) {
          if (set) {await set('windowcoverings_set', target).catch(() => {});}
          else {await cover.setCapabilityValue?.('windowcoverings_set', target).catch(() => {});}
          this.log(`[HUE] Volet ${cover.getName?.()} → ${position}%`);
          return true;
        }
        this.log(`[HUE] ${cover.getName?.()} n'a pas windowcoverings_set`);
        return false;
      });

    // ── Calibration fins de course (Tuya DP16, Quoya/Dooya) ────────────────
    this.homey.flow.getActionCard('cover_limit_calibration')
      .registerRunListener(async (args) => {
        const { cover, command } = args;
        if (!cover || !command) {return false;}
        // z2m/Tuya convention: DP16 enum border — 0=up, 1=down, 2=up_delete,
        // 3=down_delete, 4=remove_top_bottom
        const DP16 = { set_upper: 0, set_lower: 1, delete_upper: 2, delete_lower: 3, remove_all: 4 };
        const value = DP16[command];
        if (value === undefined) {return false;}
        try {
          if (typeof cover._sendTuyaDP === 'function') {
            await cover._sendTuyaDP(16, value, 'enum');
            this.log(`[CURTAIN] DP16 limit calibration '${command}' (${value}) envoyé à ${cover.getName?.()}`);
            return true;
          }
          this.log(`[CURTAIN] ${cover.getName?.()} ne supporte pas _sendTuyaDP`);
          return false;
        } catch (err) {
          this.error('[CURTAIN] DP16 failed:', err.message);
          return false;
        }
      });

    // ── Tout éteindre (style bouton "All Off" de l'app Hue) ──────────────────
    this.homey.flow.getActionCard('hue_all_off')
      .registerRunListener(async () => {
        let count = 0;
        try {
          const drivers = Object.values(this.homey.drivers?.getDrivers?.() || {});
          for (const driver of drivers) {
            for (const device of driver.getDevices?.() || []) {
              const isLight = device.getClass?.() === 'light'
                || (device.hasCapability?.('dim') && device.hasCapability?.('onoff'));
              if (!isLight) {continue;}
              await this._hueSetLight(device, { onoff: false });
              count++;
            }
          }
        } catch (err) {
          this.error('[HUE] all_off error:', err.message);
        }
        this.log(`[HUE] Tout éteint: ${count} lumières`);
        return true;
      });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v9.0.378: OTA flow cards (condition + manual discovery action)
  // ═══════════════════════════════════════════════════════════════════════════
  _registerOtaFlowCards() {
    this.homey.flow.getConditionCard('ota_has_update')
      .registerRunListener(async (args) => {
        try {
          const device = args.device;
          if (!device || !this.otaManager) {return false;}
          const id = device.getData?.()?.id;
          return !!(id && this.otaManager.discoveredUpdates?.has(id));
        } catch (err) { return false; }
      });

    this.homey.flow.getActionCard('ota_run_discovery')
      .registerRunListener(async () => {
        try {
          if (!this.otaManager) {return false;}
          await this.otaManager.runFullDiscoveryScan();
          return true;
        } catch (err) {
          this.error('[OTA] discovery failed:', err.message);
          return false;
        }
      });
  }

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

    // v9.0.375 — Condition: value is estimated (telemetry origin)
    this.homey.flow.getConditionCard('telemetry_is_estimated')
      .registerRunListener(async (args) => {
        try {
          const device = args.device;
          const capability = args.capability;
          if (!device || !capability) {return false;}
          const getStore = device.getStoreValue?.bind(device);
          if (typeof getStore !== 'function') {return false;}
          return (await getStore(`telemetry_${capability}_source`)) === 'estimated';
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
    try { if (this.liveDataUpdater?.stop) { this.liveDataUpdater.stop(); this.liveDataUpdater = null; } } catch (e) {}

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
