'use strict';

// v5.11.185: Suppress punycode DEP0040 deprecation from transitive deps
require('./lib/suppress-punycode');

const Homey = require('homey');

// WHY(P2306/P2351/P2373): Homey flow serializer can embed foreign driver URIs
// (Hue ZG9101SAC_HP, virtualdriverzigbee) OR Homey class names (`light`).
// ManagerDrivers.getDriver throws "Invalid Driver ID" and crashes the whole
// app process (Gmail 9.0.730/743/746). Soft-fail so flow deserialize continues.
// Install AFTER Homey require so ManagerDrivers.prototype exists when available.
try {
  require('./lib/utils/safe-get-driver-patch').installFromHomeyModule();
} catch (_) { /* best-effort */ }

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
const BootBudget = require('./lib/performance/BootBudget');

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
    this.homey.__tuyaApp = this;
    this.initializeSettings();

    // P2351/P2373: re-bind soft getDriver on the live ManagerDrivers instance
    // (prototype patch at module load may miss Homey's runtime instance).
    try {
      const { installSafeGetDriver } = require('./lib/utils/safe-get-driver-patch');
      const logFn = this.error?.bind(this) || this.log?.bind(this);
      installSafeGetDriver(this.homey.drivers, logFn, { force: true });
      installSafeGetDriver(Object.getPrototypeOf(this.homey.drivers), logFn, { force: true });
    } catch (_) { /* best-effort */ }

    // v10.2.1 / P2398 crash guard: wrap OR polyfill flow-card getters so a
    // missing card id OR an SDK without getDeviceActionCard/ConditionCard
    // cannot kill a driver's onInit.
    // WHY (P2398): Homey SDK3 often lacks getDeviceConditionCard /
    // getDeviceActionCard. Old polyfill returned a silent noop that still
    // looked like a real card — BaseZigBeeDriver then never fell through to
    // getConditionCard/getActionCard (meter91 2b0b4e4f / water_valve_garden
    // FLOW-GUARD spam on 9.0.743). Prefer sibling alias; mark true noops.
    try {
      const flow = this.homey.flow;
      const noopCard = {
        __flowGuardNoop: true,
        registerRunListener() { return this; },
        registerArgumentAutocompleteListener() { return this; },
        register() { return this; },
        async trigger() { return false; },
        async getValue() { return false; },
      };
      const sibling = {
        getDeviceActionCard: 'getActionCard',
        getActionCard: 'getDeviceActionCard',
        getDeviceConditionCard: 'getConditionCard',
        getConditionCard: 'getDeviceConditionCard',
        getDeviceTriggerCard: 'getTriggerCard',
        getTriggerCard: 'getDeviceTriggerCard',
      };
      const missingLogged = global.__tuyaFlowGuardMissingLogged || (global.__tuyaFlowGuardMissingLogged = new Set());
      for (const m of ['getActionCard', 'getDeviceActionCard', 'getTriggerCard', 'getDeviceTriggerCard', 'getConditionCard', 'getDeviceConditionCard']) {
        const orig = flow[m];
        if (typeof orig === 'function' && orig.__crashGuarded) {continue;}
        const wrapped = (...args) => {
          if (typeof orig === 'function') {
            try { return orig.apply(flow, args); }
            catch (e) {
              this.log('[FLOW-GUARD]', m, args[0], e.message);
              return noopCard;
            }
          }
          const altName = sibling[m];
          const alt = altName && flow[altName];
          // Prefer real sibling (unwrap guarded alias) when Device* is absent.
          if (typeof alt === 'function' && !alt.__flowGuardNoopFn) {
            try {
              const raw = alt.__crashGuarded && typeof alt.__flowGuardOrig === 'function'
                ? alt.__flowGuardOrig
                : alt;
              if (typeof raw === 'function' && !raw.__flowGuardNoopFn) {
                return raw.apply(flow, args);
              }
            } catch (e) {
              this.log('[FLOW-GUARD]', m, '→', altName, args[0], e.message);
              return noopCard;
            }
          }
          if (!missingLogged.has(m)) {
            missingLogged.add(m);
            this.log('[FLOW-GUARD]', m, 'not a function on this SDK — noop (once)');
          }
          return noopCard;
        };
        wrapped.__crashGuarded = true;
        wrapped.__flowGuardOrig = typeof orig === 'function' ? orig : null;
        wrapped.__flowGuardNoopFn = typeof orig !== 'function';
        try { flow[m] = wrapped; } catch (_e) { /* flow methods may be non-writable */ }
      }
    } catch (e) { /* flow guard is best-effort */ }

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
    this.log(`⏭️ ID database deferred (${BootBudget.heapUsedMb()} MB heap) — devices start first`);

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
      this.log('⏭️ Analytics insights deferred (boot budget)');
    } catch (err) {
      this.error('⚠️ Analytics failed (non-critical):', err.message);
    }

    try {
      this.discovery = new SmartDeviceDiscovery(this.homey);
      this.log('⏭️ Smart discovery deferred (boot budget)');
    } catch (err) {
      this.error('⚠️ Discovery failed (non-critical):', err.message);
    }

    try {
      this.optimizer = new PerformanceOptimizer({
        maxCacheSize: BootBudget.adaptiveCacheSize(),
        maxCacheMemory: BootBudget.adaptiveCacheMemory(),
      });
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
      this.log('✅ OTA Update Manager initialized (auto-discovery deferred)');
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
      this.log('⏭️ Tuya WiFi UDP discovery deferred (Zigbee devices start first)');
    } catch (err) {
      this.log('⚠️ Tuya UDP Discovery init failed (non-critical):', err.message);
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

    try {
      this.homey.flow.getActionCard('ota_check_updates').registerRunListener(async (args) => {
        this.log('[OTA] Manual check initiated via Flow');
        if (!args.device) return false;
        try {
          // WHY(P2357/P2359): fuse app OTA check with Homey Device Updates UX
          let HDU = null;
          try { HDU = require('./lib/ota/HomeyDeviceUpdates'); } catch { /* optional */ }
          const update = await this.otaManager?.checkUpdate(args.device);
          const platform = HDU?.isDeviceUpdatesPlatformReady?.(this.homey);
          const hasNative = HDU?.driverHasNativeFirmwareUpdates?.(args.device) === true;
          const payload = {
            available: !!update?.available,
            newVersion: update?.newVersion,
            platform,
            hasNativeImages: hasNative,
          };
          await this.homey.notifications.createNotification({
            excerpt: HDU?.notificationExcerpt?.(args.device.getName(), payload)
              || (update?.available
                ? `Firmware v${update.newVersion} for ${args.device.getName()} — Settings → Device Updates.`
                : `${args.device.getName()} is on the latest firmware known to this app.`),
          });
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
      this._registerPresenceFlowCards();
      this.log('✅ Virtual Presence Detection flow cards registered');
    } catch (err) {
      this.error('⚠️ Presence flow cards failed (non-critical):', err.message);
    }

    try {
      this._registerCommunitySmartFlowCards();
      this.log('✅ Community smart flow cards registered');
    } catch (err) {
      this.error('⚠️ Community smart flow cards failed (non-critical):', err.message);
    }

    try {
      this._registerOtaFlowCards();
      this.log('✅ OTA flow cards registered');
    } catch (err) {
      this.error('⚠️ OTA flow cards failed (non-critical):', err.message);
    }

    // WHY: Peter #2183 — 93.8 MB + greyed Flows. Let sleepy devices finish
    // onNodeInit before MASTER_ONLY engines, UDP, and catalog scans.
    this._scheduleDeferredMasterFeatures();

    this.log(`✅ Tuya Unified Zigbee App initialized (${BootBudget.heapUsedMb()} MB heap)`);
    this._clearMigrationQueue();
  }

  _scheduleDeferredMasterFeatures() {
    if (this._heavyInitTimer || this._heavyInitStarted) {return;}
    const delay = BootBudget.DEFER_MS;
    this.log(`⏭️ Heavy features in ${Math.round(delay / 1000)}s (boot budget)`);
    try {
      this._heavyInitTimer = this.homey.setTimeout(() => {
        this._heavyInitTimer = null;
        this._initDeferredMasterFeatures().catch((err) => {
          this.error('⚠️ Deferred features failed (non-critical):', err.message);
        });
      }, delay);
    } catch (err) {
      this.error('⚠️ Could not schedule deferred features:', err.message);
    }
  }

  _scheduleDeferredMasterFeaturesRetry() {
    if (this._heavyRetryScheduled || this._destroyed) {return;}
    this._heavyRetryScheduled = true;
    const delay = BootBudget.RETRY_MS;
    this.log(`⏭️ Heavy features retry in ${Math.round(delay / 1000)}s (heap still high)`);
    try {
      this._heavyRetryTimer = this.homey.setTimeout(() => {
        this._heavyRetryTimer = null;
        this._initDeferredMasterFeatures({ retry: true }).catch((err) => {
          this.error('⚠️ Deferred features retry failed (non-critical):', err.message);
        });
      }, delay);
    } catch (err) {
      this.log('⚠️ Could not schedule heavy-feature retry:', err.message);
    }
  }

  async _initDeferredMasterFeatures(opts = {}) {
    if (this._destroyed) {return;}
    const retry = opts.retry === true;
    if (this._heavyInitStarted && !retry) {return;}
    this._heavyInitStarted = true;
    const allowHeavy = BootBudget.shouldStartHeavyFeatures();
    this.log(`[BOOT-BUDGET] deferred pass heap=${BootBudget.heapUsedMb()} MB heavy=${allowHeavy} retry=${retry}`);

    if (!allowHeavy && !retry) {
      this._scheduleDeferredMasterFeaturesRetry();
    }

    if (allowHeavy) {
      try {
        await this.identificationDatabase?.buildDatabase?.();
        this.log('✅ Intelligent Device Identification Database built');
      } catch (err) {
        this.error('⚠️ Device ID Database build failed (non-critical):', err.message);
      }

      try {
        await this.analytics?.initialize?.();
        this.log('✅ Advanced Analytics initialized');
      } catch (err) {
        this.error('⚠️ Analytics failed (non-critical):', err.message);
      }

      try {
        await this.discovery?.initialize?.();
        this.log('✅ Smart Device Discovery initialized');
      } catch (err) {
        this.error('⚠️ Discovery failed (non-critical):', err.message);
      }

      try {
        this.otaManager?.startAutoDiscovery?.(6 * 60 * 60 * 1000);
        this.log('✅ OTA Auto-Discovery started (6h interval)');
      } catch (e) {
        this.log('⚠️ OTA Auto-Discovery failed to start (non-critical):', e.message);
      }

      try {
        this.groupManager = new DeviceGroupManager(this.homey);
        await this.groupManager.initialize();
        this.log('✅ Device Group Manager initialized');
      } catch (err) {
        this.error('⚠️ GroupManager failed (non-critical):', err.message);
      }

      try {
        this.healthDashboard = new DeviceHealthDashboard(this.homey, this.healthMonitor);
        this.log('✅ Device Health Dashboard initialized');
      } catch (err) {
        this.error('⚠️ HealthDashboard failed (non-critical):', err.message);
      }

      try {
        this.pairingWizard = new AutoDetectionPairingWizard(this.homey);
        this.errorTranslator = new UserFriendlyErrors();
        this.configValidator = new ConfigSchemaValidator();
        this.dpRegistry = new CentralizedDPRegistry();
      } catch (err) {
        this.error('⚠️ Pairing/DP helpers failed (non-critical):', err.message);
      }

      try {
        await this.initializeInsights();
      } catch (err) { this.error('⚠️ Insights failed:', err.message); }

      try {
        if (this._tuyaUDPDiscovery && typeof this._tuyaUDPDiscovery.start === 'function') {
          const updateDeviceIP = async (info) => {
            try {
              const drivers = Object.values(this.homey.drivers.getDrivers());
              for (const driver of drivers) {
                const devices = driver.getDevices() || [];
                for (const device of devices) {
                  const settings = device.getSettings();
                  if (settings && settings.device_id === info.deviceId) {
                    const currentIp = settings.ip || settings.ip_address || settings.device_ip;
                    if (currentIp !== info.ip) {
                      this.log(`🔄 [SMART-HEAL] IP change: ${currentIp || '—'} -> ${info.ip}`);
                      await device.setSettings({ ip: info.ip, ip_address: info.ip }).catch((e) => this.error('[SMART-HEAL] Settings update failed', e));
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
          this.log('✅ Tuya WiFi UDP Discovery started (ports 6666/6667/6668/7000)');
        }
      } catch (err) {
        this.log('⚠️ Tuya UDP Discovery failed (non-critical):', err.message);
      }
    } else {
      this.log('⏭️ Skipping catalog/UDP/analytics — heap still high');
    }

    try {
      if (retry && this.featureFlowCards) {
        if (allowHeavy) {
          try { this.scheduleManager?.start?.(); } catch (_e) { /* already started */ }
          try { this.predictiveHealthEngine?.start?.(); } catch (_e) { /* already started */ }
          try { this.homeModeManager?.start?.(); } catch (_e) { /* already started */ }
          try { this.solarElevation?.startObserving?.(); } catch (_e) { /* already started */ }
          if (this.availabilityManager && !this._availabilityStarted) {
            for (const driver of Object.values(this.homey.drivers.getDrivers())) {
              for (const device of driver.getDevices()) {
                this.availabilityManager.registerDevice(device);
              }
            }
            this.availabilityManager.start();
            this._availabilityStarted = true;
          }
          if (!this.liveDataUpdater) {
            try {
              const LiveDataUpdater = require('./lib/dynamic/LiveDataUpdater');
              this.liveDataUpdater = new LiveDataUpdater(this.homey, this.log.bind(this));
              await this.liveDataUpdater.start();
              const FingerprintMatcher = require('./lib/utils/fingerprint-matcher');
              FingerprintMatcher.setOverlayProvider(() => this.liveDataUpdater?.getOverlay?.() || null);
              this.log('✅ LiveDataUpdater started (retry pass)');
            } catch (err) {
              this.log('⚠️ LiveDataUpdater retry skipped:', err.message);
            }
          }
          this.log('✅ Deferred feature engines started (retry, heap recovered)');
        }
        await this._scanForPhantomDevices();
        return;
      }

      this.solarElevation = new SolarElevation({ homey: this.homey, logger: this.log.bind(this) });
      this.transitionEngine = new TransitionEngine({ homey: this.homey });
      this.energyHistoryStore = new EnergyHistoryStore(this.homey);
      if (allowHeavy) {
        await this.energyHistoryStore.initialize();
      }
      this.tariffCalculator = new TariffCalculator({ logger: this.log.bind(this) });
      this.scheduleManager = new ScheduleManager(this.homey);
      if (allowHeavy) {this.scheduleManager.start();}
      this.conditionEngine = new ConditionEngine(this.homey);
      this.predictiveHealthEngine = new PredictiveHealthEngine(this.homey);
      if (allowHeavy) {this.predictiveHealthEngine.start();}

      if (allowHeavy) {
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
      } else {
        this.log('⏭️ LiveDataUpdater skipped (heap budget)');
      }

      if (retry && this.featureFlowCards) {
        if (allowHeavy) {
          try { this.scheduleManager?.start?.(); } catch (_e) { /* already started */ }
          try { this.predictiveHealthEngine?.start?.(); } catch (_e) { /* already started */ }
          try { this.homeModeManager?.start?.(); } catch (_e) { /* already started */ }
          try { this.solarElevation?.startObserving?.(); } catch (_e) { /* already started */ }
          if (this.availabilityManager && !this._availabilityStarted) {
            for (const driver of Object.values(this.homey.drivers.getDrivers())) {
              for (const device of driver.getDevices()) {
                this.availabilityManager.registerDevice(device);
              }
            }
            this.availabilityManager.start();
            this._availabilityStarted = true;
          }
          if (!this.liveDataUpdater) {
            try {
              const LiveDataUpdater = require('./lib/dynamic/LiveDataUpdater');
              this.liveDataUpdater = new LiveDataUpdater(this.homey, this.log.bind(this));
              await this.liveDataUpdater.start();
              const FingerprintMatcher = require('./lib/utils/fingerprint-matcher');
              FingerprintMatcher.setOverlayProvider(() => this.liveDataUpdater?.getOverlay?.() || null);
              this.log('✅ LiveDataUpdater started (retry pass)');
            } catch (err) {
              this.log('⚠️ LiveDataUpdater retry skipped:', err.message);
            }
          }
          this.log('✅ Deferred feature engines started (retry, heap recovered)');
        }
        await this._scanForPhantomDevices();
        return;
      }

      this.networkTopologyCollector = new NetworkTopologyCollector(this.homey);
      if (allowHeavy && this.solarElevation.startObserving) {
        this.solarElevation.startObserving();
      }

      const DeviceAvailabilityManager = require('./lib/managers/DeviceAvailabilityManager');
      this.availabilityManager = new DeviceAvailabilityManager(this.homey, {
        logger: (...a) => this.log(...a),
      });
      if (allowHeavy) {
        for (const driver of Object.values(this.homey.drivers.getDrivers())) {
          for (const device of driver.getDevices()) {
            this.availabilityManager.registerDevice(device);
          }
        }
        this.availabilityManager.start();
        this._availabilityStarted = true;
      } else {
        this.log('⏭️ Availability scan skipped (heap budget) — retry later');
      }
      this.homey.on('device.create', (device) => this.availabilityManager.registerDevice(device));

      const SensorSuppressionManager = require('./lib/managers/SensorSuppressionManager');
      this.sensorSuppressionManager = new SensorSuppressionManager(this.homey, {
        logger: (...a) => this.log(...a),
      });

      const PresenceSimulationManager = require('./lib/managers/PresenceSimulationManager');
      this.presenceSimulationManager = new PresenceSimulationManager(this.homey, {
        logger: (...a) => this.log(...a),
      });

      const FeatureFallbackRouter = require('./lib/managers/FeatureFallbackRouter');
      this.featureFallbackRouter = new FeatureFallbackRouter(this.homey, {
        logger: (...a) => this.log(...a),
      });

      const CircadianEngine = require('./lib/managers/CircadianEngine');
      this.circadianEngine = new CircadianEngine(this.homey, {
        solarElevation: this.solarElevation,
        logger: (...a) => this.log(...a),
      });
      const MotionCascadeManager = require('./lib/managers/MotionCascadeManager');
      this.motionCascadeManager = new MotionCascadeManager(this.homey, {
        logger: (...a) => this.log(...a),
      });

      const HomeModeManager = require('./lib/managers/HomeModeManager');
      this.homeModeManager = new HomeModeManager(this.homey, {
        solarElevation: this.solarElevation,
        logger: (...a) => this.log(...a),
      });
      if (allowHeavy) {this.homeModeManager.start();}

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
      this.featureFlowCards.setHomeModeManager(this.homeModeManager);
      this.featureFlowCards.registerAll();
      this.log('✅ Feature modules and flow cards initialized (deferred)');
      try { BootBudget.maybeGc(); } catch (_e) { /* best-effort */ }
      await this._scanForPhantomDevices();
    } catch (err) {
      this.error('⚠️ Feature modules failed (non-critical):', err.message);
    }
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
  // Community smart features (Daylight Atmosphere / Path Light / Dawn / Dusk)
  // Flow card IDs keep legacy hue_* keys so existing Homey flows do not break.
  // UI titles are brand-free — see config/architecture/smart-features-ssot.json
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
    if (temperature !== undefined) {
      if (light.hasCapability?.('light_temperature')) {await set('light_temperature', temperature);}
      else if (light.hasCapability?.('light_color_temp')) {await set('light_color_temp', temperature);}
    }
  }

  _hueCircadianCurve(date = new Date(), lux = null) {
    try {
      const DaylightAtmosphere = require('./lib/features/DaylightAtmosphere');
      const curve = DaylightAtmosphere.compute({
        date,
        solar: this.solarElevation,
        lux,
      });
      return { dim: curve.dim, temperature: curve.temperature, kelvin: curve.kelvin, source: curve.source };
    } catch {
      const h = date.getHours() + date.getMinutes() / 60;
      if (h < 5) {return { dim: 0.1, temperature: 1.0 };}
      if (h < 8) {return { dim: 0.3, temperature: 0.75 };}
      if (h < 17) {return { dim: 1.0, temperature: 0.15 };}
      if (h < 21) {return { dim: 0.5, temperature: 0.7 };}
      return { dim: 0.2, temperature: 0.95 };
    }
  }

  /** @deprecated alias — use _registerCommunitySmartFlowCards */
  _registerHueStyleFlowCards() {
    return this._registerCommunitySmartFlowCards();
  }

  _registerCommunitySmartFlowCards() {
    // ── Path Light (motion) ─────────────────────────────────────────────────
    this.homey.flow.getActionCard('hue_motion_lighting')
      .registerRunListener(async (args) => {
        const { motion_sensor: sensor, light, brightness = 80, timeout = 5, lux_threshold = 0, quiet_start, quiet_end } = args;
        if (!sensor || !light) {return false;}

        if (quiet_start && quiet_end && /^\d{1,2}:\d{2}$/.test(quiet_start) && /^\d{1,2}:\d{2}$/.test(quiet_end)) {
          const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
          const now = new Date().getHours() * 60 + new Date().getMinutes();
          const qs = toMin(quiet_start), qe = toMin(quiet_end);
          const inQuiet = qs <= qe ? (now >= qs && now < qe) : (now >= qs || now < qe);
          if (inQuiet) {
            this.log(`[PATH-LIGHT] skipped: quiet hours ${quiet_start}-${quiet_end}`);
            return false;
          }
        }

        let lux = null;
        if (sensor.hasCapability?.('measure_luminance')) {
          lux = sensor.getCapabilityValue?.('measure_luminance');
          if (lux_threshold > 0 && typeof lux === 'number' && lux >= lux_threshold) {
            this.log(`[PATH-LIGHT] skipped: lux ${lux} >= ${lux_threshold}`);
            return false;
          }
        }
        if (sensor.hasCapability?.('alarm_motion')) {
          const motion = sensor.getCapabilityValue?.('alarm_motion');
          if (motion === false) {return false;}
        }

        // Seed Room Balance lux for Solar Sync on this light
        if (typeof lux === 'number') {
          light.setStoreValue?.('room_balance_lux', lux).catch(() => {});
        }

        const curve = this._hueCircadianCurve(new Date(), typeof lux === 'number' ? lux : null);
        const dim = Math.max(1, Math.min(100, brightness)) / 100;
        await this._hueSetLight(light, {
          onoff: true,
          dim,
          temperature: curve.temperature,
        });
        this.log(`[PATH-LIGHT] ${light.getName?.()} ON ${brightness}% CT=${curve.temperature}`);

        this.homey.clearTimeout?.(light._hueMotionTimer);
        light._hueMotionTimer = this.homey.setTimeout(async () => {
          await this._hueSetLight(light, { onoff: false });
          this.log(`[PATH-LIGHT] ${light.getName?.()} OFF after ${timeout} min`);
        }, Math.max(1, timeout) * 60 * 1000);
        return true;
      });

    // ── Solar Sync apply (legacy id hue_circadian_apply) ─────────────────────
    this.homey.flow.getActionCard('hue_circadian_apply')
      .registerRunListener(async (args) => {
        const { light } = args;
        if (!light) {return false;}
        const lux = light.getStoreValue?.('room_balance_lux');
        const curve = this._hueCircadianCurve(new Date(), typeof lux === 'number' ? lux : null);
        await this._hueSetLight(light, { onoff: true, dim: curve.dim, temperature: curve.temperature });
        this.log(`[SOLAR-SYNC] ${light.getName?.()}: dim=${curve.dim} temp=${curve.temperature} (${curve.source || 'ssot'})`);
        return true;
      });

    // ── Dawn Ramp ───────────────────────────────────────────────────────────
    this.homey.flow.getActionCard('hue_wakeup')
      .registerRunListener(async (args) => {
        const { light, ramp_minutes: duration = 15, target = 100 } = args;
        if (!light) {return false;}
        const steps = Math.max(5, Math.min(30, duration));
        const stepMs = (duration * 60 * 1000) / steps;
        const targetDim = Math.max(10, Math.min(100, target)) / 100;
        this.homey.clearInterval?.(light._hueWakeupTimer);
        let step = 0;
        const startCurve = this._hueCircadianCurve();
        await this._hueSetLight(light, { onoff: true, dim: 0.01, temperature: Math.min(1, startCurve.temperature + 0.15) });
        light._hueWakeupTimer = this.homey.setInterval(async () => {
          step++;
          const dim = Math.min(targetDim, 0.01 + (targetDim - 0.01) * (step / steps));
          const t = this._hueCircadianCurve().temperature;
          await this._hueSetLight(light, { dim: Math.round(dim * 100) / 100, temperature: t });
          if (step >= steps) {
            this.homey.clearInterval?.(light._hueWakeupTimer);
            light._hueWakeupTimer = null;
            this.log(`[DAWN-RAMP] done ${light.getName?.()}: ${targetDim * 100}%`);
          }
        }, stepMs);
        this.log(`[DAWN-RAMP] start ${light.getName?.()}: ${steps} steps`);
        return true;
      });

    // ── Dusk Fade ───────────────────────────────────────────────────────────
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
          const warm = Math.min(1, this._hueCircadianCurve().temperature + 0.2 * (step / steps));
          await this._hueSetLight(light, { dim: Math.round(dim * 100) / 100, temperature: warm });
          if (step >= steps) {
            this.homey.clearInterval?.(light._hueWakeupTimer);
            light._hueWakeupTimer = null;
            await this._hueSetLight(light, { onoff: false });
            this.log(`[DUSK-FADE] done ${light.getName?.()}: OFF`);
          }
        }, stepMs);
        this.log(`[DUSK-FADE] start ${light.getName?.()}`);
        return true;
      });

    // ── Scene Slots ─────────────────────────────────────────────────────────
    this.homey.flow.getActionCard('scene_capture')
      .registerRunListener(async (args) => {
        const { light, slot = 1 } = args;
        if (!light) {return false;}
        const scene = {
          onoff: light.getCapabilityValue?.('onoff'),
          dim: light.getCapabilityValue?.('dim'),
          temperature: light.getCapabilityValue?.('light_temperature')
            ?? light.getCapabilityValue?.('light_color_temp'),
          capturedAt: Date.now(),
        };
        await light.setStoreValue?.(`hue_scene_${slot}`, scene).catch(() => {});
        this.log(`[SCENE-SLOT] captured ${slot} for ${light.getName?.()}`);
        return true;
      });

    this.homey.flow.getActionCard('scene_apply')
      .registerRunListener(async (args) => {
        const { light, slot = 1 } = args;
        if (!light) {return false;}
        const scene = await light.getStoreValue?.(`hue_scene_${slot}`);
        if (!scene) {
          this.log(`[SCENE-SLOT] empty slot ${slot} for ${light.getName?.()}`);
          return false;
        }
        await this._hueSetLight(light, {
          onoff: scene.onoff !== false,
          dim: scene.dim,
          temperature: scene.temperature,
        });
        this.log(`[SCENE-SLOT] applied ${slot} to ${light.getName?.()}`);
        return true;
      });

    // ── Soft Fade ───────────────────────────────────────────────────────────
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
            this.log(`[SOFT-FADE] done ${light.getName?.()}: ${targetDim * 100}%`);
          }
        }, stepMs);
        return true;
      });

    // ── Next Scene Slot ─────────────────────────────────────────────────────
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
          this.log(`[SCENE-SLOT] cycle empty ${next} for ${light.getName?.()}`);
          return false;
        }
        await this._hueSetLight(light, {
          onoff: scene.onoff !== false,
          dim: scene.dim,
          temperature: scene.temperature,
        });
        this.log(`[SCENE-SLOT] cycle ${next}/${count} → ${light.getName?.()}`);
        return true;
      });

    // ── Cover Setpoint ──────────────────────────────────────────────────────
    this.homey.flow.getActionCard('cover_set_position')
      .registerRunListener(async (args) => {
        const { cover, position = 50 } = args;
        if (!cover) {return false;}
        const target = Math.max(0, Math.min(100, position)) / 100;
        const set = cover.safeSetCapabilityValue?.bind(cover);
        if (cover.hasCapability?.('windowcoverings_set')) {
          if (set) {await set('windowcoverings_set', target).catch(() => {});}
          else {await cover.setCapabilityValue?.('windowcoverings_set', target).catch(() => {});}
          this.log(`[COVER] ${cover.getName?.()} → ${position}%`);
          return true;
        }
        this.log(`[COVER] ${cover.getName?.()} missing windowcoverings_set`);
        return false;
      });

    // ── Curtain limit calibration (Tuya DP16) ───────────────────────────────
    this.homey.flow.getActionCard('cover_limit_calibration')
      .registerRunListener(async (args) => {
        const { cover, command } = args;
        if (!cover || !command) {return false;}
        const DP16 = { set_upper: 0, set_lower: 1, delete_upper: 2, delete_lower: 3, remove_all: 4 };
        const value = DP16[command];
        if (value === undefined) {return false;}
        try {
          if (typeof cover._sendTuyaDP === 'function') {
            await cover._sendTuyaDP(16, value, 'enum');
            this.log(`[CURTAIN] DP16 '${command}' (${value}) → ${cover.getName?.()}`);
            return true;
          }
          this.log(`[CURTAIN] ${cover.getName?.()} no _sendTuyaDP`);
          return false;
        } catch (err) {
          this.error('[CURTAIN] DP16 failed:', err.message);
          return false;
        }
      });

    // ── All Lights Off ──────────────────────────────────────────────────────
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
          this.error('[ALL-OFF] error:', err.message);
        }
        this.log(`[ALL-OFF] ${count} lights`);
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
    try {
      if (this._heavyInitTimer) {
        this.homey.clearTimeout(this._heavyInitTimer);
        this._heavyInitTimer = null;
      }
    } catch (e) {}
    // WHY(P2321): tear down availability first (sync flag) so device onUninit
    // cannot race store writes after app teardown — HomeSuite idea, MIT reimpl.
    try {
      if (this.availabilityManager?.destroy) {
        this.availabilityManager.destroy();
      }
      this.availabilityManager = null;
      this._availabilityStarted = false;
    } catch (e) {}
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
    try { this.homey.__tuyaApp = null; } catch (e) {}

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
