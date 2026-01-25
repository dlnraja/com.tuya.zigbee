'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaEF00Manager = require('../tuya/TuyaEF00Manager');
const { getAppVersionPrefixed } = require('../utils/AppVersion');
const greenPower = require('../green_power');
const UniversalDataHandler = require('../utils/UniversalDataHandler');
const ProtocolAutoOptimizer = require('../ProtocolAutoOptimizer');
const ManufacturerVariationManager = require('../ManufacturerVariationManager');
const { ProductValueValidator } = require('../ProductValueValidator');
const { getModelId, getManufacturer } = require('../helpers/DeviceDataHelper');
const {
  tuyaDataQuery,
  safeTuyaDataQuery,
  isSleepyEndDevice,
  updateRadioActivity,
  DP_PRESETS
} = require('../tuya/TuyaDataQuery');
const {
  syncDeviceTime,
  syncDeviceTimeTuya,
  TuyaTimeSyncMixin,
  TUYA_EPOCH_OFFSET
} = require('../tuya/TuyaTimeSync');
const { DataRecoveryManager } = require('../tuya/DataRecoveryManager');
const { HybridDataQuery, ZigbeeDataQuery } = require('../zigbee/ZigbeeDataQuery');
// v5.5.84: Universal parser for intelligent multi-format support
// v5.5.143: Added context-aware DP/ZCL mapping by manufacturerName/driverType
const {
  parseTuyaFrame,
  getUniversalDPMapping,
  setupUniversalZCLListeners,
  UNIVERSAL_DP_PATTERNS,
  UNIVERSAL_ZCL_CLUSTERS,
  // v5.5.143: Context-aware mapping functions
  getContextualDpMapping,
  getIasZoneCapability,
  usesIasAceCluster,
  DEVICE_PROFILES,
  ZCL_DEVICE_PROFILES
} = require('../tuya/UniversalTuyaParser');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║           HybridSensorBase - Dynamic version from app.json                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  THE ULTIMATE SENSOR BASE CLASS                                              ║
 * ║                                                                              ║
 * ║  v5.5.299: SLEEPY DEVICE COMMUNICATION OPTIMIZATION                         ║
 * ║  - Smart ZCL timeout management for battery devices                          ║
 * ║  - Wake state tracking and intelligent query scheduling                      ║
 * ║  - Tuya DP prioritization over ZCL for sleepy sensors                       ║
 * ║                                                                              ║
 * ║  - Uses UniversalDataHandler for ALL data types                              ║
 * ║  - Uses TuyaEF00Manager as fallback                                          ║
 * ║  - TuyaDataQuery for standardized DP queries                                 ║
 * ║  - safeTuyaDataQuery for sleepy device handling                              ║
 * ║  - DataRecoveryManager for automatic data recovery                           ║
 * ║  - Multiple fallback strategies                                              ║
 * ║  - Phantom device prevention                                                 ║
 * ║  - Auto-detection of protocol (Tuya DP / ZCL / Hybrid)                       ║
 * ║                                                                              ║
 * ║  SUPPORTED SENSOR TYPES:                                                     ║
 * ║  - Climate (temperature, humidity)                                           ║
 * ║  - Motion / PIR / Presence / Radar                                           ║
 * ║  - Contact / Door / Window                                                   ║
 * ║  - Water leak / Smoke / Gas / CO                                             ║
 * ║  - Illuminance / Vibration / Soil                                            ║
 * ║  - Air quality (PM2.5, VOC, CO2, formaldehyde)                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */
class HybridSensorBase extends ZigBeeDevice {

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION (override in subclasses if needed)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Battery powered by default */
  get mainsPowered() { return false; }

  /** Max listeners per cluster */
  get maxListeners() { return 50; }

  /** Capabilities this sensor supports (override in subclass) */
  get sensorCapabilities() {
    return ['measure_temperature', 'measure_humidity', 'measure_battery'];
  }

  /**
   * v5.5.401: FAST INIT MODE for sleepy devices (smoke detectors, etc.)
   * When true, defers complex initialization to prevent pairing timeout
   * Override to true in device classes that need fast pairing
   */
  get fastInitMode() { return false; }

  /** DP mappings for Tuya EF00 devices (override in subclass) */
  get dpMappings() {
    return {
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 10 },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  /**
   * v5.5.199: ZHA/Hubitat-style battery enum converter
   * Many Tuya devices report battery as enum: 0=low, 1=medium, 2=high
   * Convert to percentage like ZHA TuyaQuirkBuilder does
   */
  get batteryEnumMap() {
    return { 0: 10, 1: 50, 2: 100 };
  }

  /**
   * v5.5.199: Hubitat-style health status tracking
   * Track packet statistics for debugging connectivity issues
   */
  get healthStatus() {
    return {
      txCtr: this._txCounter || 0,
      rxCtr: this._rxCounter || 0,
      lastRx: this._lastRxTimestamp || null,
      lastTx: this._lastTxTimestamp || null,
      online: this.getAvailable?.() ?? true
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  async onNodeInit({ zclNode }) {
    // DIAGNOSTIC MASSIF - TOUS LES DEVICES
    this.log('🔍 [DIAGNOSTIC-MASSIF] ═══════════════════════════════════════');
    this.log('🔍 [DIAGNOSTIC-MASSIF] HybridSensorBase.onNodeInit() APPELÉ');
    this.log(`🔍 [DIAGNOSTIC-MASSIF] Device: ${this.getName()} (${this.driver ? this.driver.id : 'unknown-driver'})`);
    this.log(`🔍 [DIAGNOSTIC-MASSIF] Data: ${JSON.stringify(this.getData())}`);
    this.log(`🔍 [DIAGNOSTIC-MASSIF] Settings: ${JSON.stringify(this.getSettings())}`);
    this.log(`🔍 [DIAGNOSTIC-MASSIF] Available: ${this.getAvailable()}`);
    this.log(`🔍 [DIAGNOSTIC-MASSIF] zclNode: ${zclNode ? 'PRÉSENT' : 'NULL'}`);
    this.log('🔍 [DIAGNOSTIC-MASSIF] ═══════════════════════════════════════');

    // ─────────────────────────────────────────────────────────────────────────
    // GUARD 1: Prevent double initialization
    // ─────────────────────────────────────────────────────────────────────────
    if (this._hybridSensorInited) {
      this.log('[HYBRID-SENSOR] ⚠️ Already initialized, skipping');
      return;
    }
    this._hybridSensorInited = true;

    // ─────────────────────────────────────────────────────────────────────────
    // GUARD 2: CRITICAL - Block phantom sub-devices COMPLETELY
    // v5.3.85: Aggressive fix - don't even initialize phantom devices
    // ─────────────────────────────────────────────────────────────────────────
    const deviceData = this.getData();
    if (deviceData.subDeviceId !== undefined) {
      this.error(`[PHANTOM] ❌ BLOCKED phantom sub-device (subDeviceId: ${deviceData.subDeviceId})`);
      this.error('[PHANTOM] ❌ SENSORS DO NOT HAVE SUB-DEVICES!');
      this.error('[PHANTOM] ❌ Please delete this device manually from Homey app');

      // Set unavailable with clear instructions
      await this.setUnavailable('❌ PHANTOM - Supprimez manuellement').catch(() => { });

      // CRITICAL: Throw error to completely stop initialization
      // This prevents memory leaks and excessive listeners
      throw new Error(`PHANTOM_DEVICE_BLOCKED: subDeviceId=${deviceData.subDeviceId}`);
    }

    // Store zclNode reference
    this.zclNode = zclNode;

    // ─────────────────────────────────────────────────────────────────────────
    // v5.5.630: SDK3 BEST PRACTICE - isFirstInit() for first-time setup
    // Configure attribute reporting only on first init (pairing)
    // Source: apps.developer.homey.app/wireless/zigbee#best-practices
    // ─────────────────────────────────────────────────────────────────────────
    if (this.isFirstInit()) {
      this.log('[SDK3] 🆕 First initialization - configuring attribute reporting');
      await this._configureAttributeReportingSDK3(zclNode).catch(e => 
        this.log(`[SDK3] ⚠️ Attribute reporting config skipped: ${e.message}`)
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // v5.5.401: FAST INIT MODE for sleepy devices (smoke detectors, etc.)
    // Defers complex initialization to prevent pairing timeout
    // ─────────────────────────────────────────────────────────────────────────
    if (this.fastInitMode) {
      this.log('[FAST-INIT] ⚡ Fast init mode enabled for sleepy device');
      await this._fastInit(zclNode);
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 0: v5.6.0 - Apply dynamic manufacturerName configuration
    // ─────────────────────────────────────────────────────────────────────────
    this.log('🔍 [DIAGNOSTIC-MASSIF] STEP 0: Configuration dynamique manufacturerName...');
    await this._applyManufacturerConfig();

    // v5.6.2: Initialize intelligent value validator
    const driverType = this.driver?.id || 'climate_sensor';
    const productType = ProductValueValidator.detectProductType(driverType);
    this._valueValidator = ProductValueValidator.createDeviceValidator(this, productType);
    this.log(`[VALIDATOR] 🎯 Initialized for productType: ${productType}`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 0.5: v5.5.103 - Detect available clusters FIRST (Peter's fix)
    // This prevents trying to read non-existent clusters (causes timeouts)
    // ─────────────────────────────────────────────────────────────────────────
    this.log('🔍 [DIAGNOSTIC-MASSIF] STEP 0.5: Détection clusters...');
    this._detectAvailableClusters();
    this.log(`🔍 [DIAGNOSTIC-MASSIF] Clusters détectés: ${JSON.stringify(Object.keys(this._availableClusters || {}))}`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Detect protocol
    // ─────────────────────────────────────────────────────────────────────────
    this.log('🔍 [DIAGNOSTIC-MASSIF] STEP 1: Détection protocole...');
    this._protocolInfo = this._detectProtocol();
    this.log(`🔍 [DIAGNOSTIC-MASSIF] Protocole détecté: ${JSON.stringify(this._protocolInfo)}`);

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log(`║          HYBRID SENSOR BASE ${getAppVersionPrefixed()}`.padEnd(62) + '║');
    this.log('╠══════════════════════════════════════════════════════════════╣');
    this.log(`║ Model:        ${this._protocolInfo.modelId || '(unknown)'}`);
    this.log(`║ Manufacturer: ${this._protocolInfo.mfr || '(unknown)'}`);
    this.log(`║ Protocol:     ${this._protocolInfo.protocol}`);
    this.log(`║ Mode:         ${this._protocolInfo.isTuyaDP ? 'TUYA DP (0xEF00)' : 'ZCL STANDARD'}`);
    this.log('╚══════════════════════════════════════════════════════════════╝');
    this.log('');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Migrate capabilities (add missing ones)
    // ─────────────────────────────────────────────────────────────────────────
    await this._migrateCapabilities();

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2.5: Initialize PROTOCOL AUTO-OPTIMIZER (v5.5.63)
    // After 15 min, pauses protocols that don't receive data
    // ─────────────────────────────────────────────────────────────────────────
    this.log('');
    this.log('🔄 STEP 2.5: Initializing Protocol Auto-Optimizer...');
    this.protocolOptimizer = new ProtocolAutoOptimizer(this, { verbose: true });
    await this.protocolOptimizer.initialize(zclNode);

    // Listen to optimization decision
    this.protocolOptimizer.on('decision', (mode, stats) => {
      this.log(`[AUTO-OPT] ✅ Decision made: ${mode}`);
      this.log(`[AUTO-OPT] Stats: Tuya=${stats.protocols.tuya.hits}, ZCL=${stats.protocols.zcl.hits}`);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Initialize UNIVERSAL DATA HANDLER (handles ALL data types)
    // ─────────────────────────────────────────────────────────────────────────
    this.log('🔍 [DIAGNOSTIC-MASSIF] STEP 3: Initializing Universal Data Handler...');
    this.log(`🔍 [DIAGNOSTIC-MASSIF] zclNode endpoints: ${JSON.stringify(Object.keys(zclNode?.endpoints || {}))}`);
    this.log(`🔍 [DIAGNOSTIC-MASSIF] Device capabilities: ${JSON.stringify(this.getCapabilities())}`);
    try {
      this.universalDataHandler = new UniversalDataHandler(this, { verbose: true });
      this.log('🔍 [DIAGNOSTIC-MASSIF] UniversalDataHandler créé, initialisation...');
      await this.universalDataHandler.initialize(zclNode);
      this.log('🔍 [DIAGNOSTIC-MASSIF] UniversalDataHandler initialisé avec succès');

      // Listen to ALL events from UniversalDataHandler
      this.universalDataHandler.on('dp', (dpId, value, dataType) => {
        // v5.5.63: Register hit with optimizer
        if (this.protocolOptimizer) {
          this.protocolOptimizer.registerHit('tuya', dpId, value);
        }
        // Only process if protocol is still active
        if (!this.protocolOptimizer || this.protocolOptimizer.isActive('tuya')) {
          this.log(`[UDH→SENSOR] DP${dpId} received: ${value} (type: ${dataType})`);
          this._handleDP(dpId, value);
        }
      });

      this.universalDataHandler.on('zcl', (cluster, attr, value) => {
        // v5.5.63: Register hit with optimizer
        if (this.protocolOptimizer) {
          this.protocolOptimizer.registerHit('zcl', cluster, value);
        }
        // Only process if protocol is still active
        if (!this.protocolOptimizer || this.protocolOptimizer.isActive('zcl')) {
          this.log(`[UDH→SENSOR] ZCL ${cluster}.${attr} received: ${value}`);
          this._handleZCLData(cluster, attr, value);
        }
      });

      this.universalDataHandler.on('capability', (capability, value) => {
        this.log(`[UDH→SENSOR] Capability ${capability} = ${value}`);
        this._safeSetCapability(capability, value);
      });

      this.log('✅ Universal Data Handler initialized and listening');
    } catch (err) {
      this.log(`⚠️ Universal Data Handler failed: ${err.message}`);
      this.log('📦 Falling back to legacy handlers...');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Bump maxListeners on clusters
    // ─────────────────────────────────────────────────────────────────────────
    this._bumpMaxListeners(zclNode);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: v5.3.93 CRITICAL - Setup ALL protocols SIMULTANEOUSLY
    // Some devices send via BOTH ZCL and Tuya DP - we must listen to ALL!
    // ─────────────────────────────────────────────────────────────────────────
    this.log('[HYBRID] ════════════════════════════════════════════════════════');
    this.log('[HYBRID] v5.3.93: Setting up ALL protocols simultaneously');
    this.log('[HYBRID] ════════════════════════════════════════════════════════');

    // Track which methods actually receive data
    this._protocolStats = {
      tuyaDP: { received: 0, lastTime: null },
      zcl: { received: 0, lastTime: null },
      iasZone: { received: 0, lastTime: null },
      raw: { received: 0, lastTime: null }
    };

    // v5.5.199: Hubitat-style packet counters for health tracking
    this._txCounter = 0;
    this._rxCounter = 0;
    this._lastRxTimestamp = null;
    this._lastTxTimestamp = null;

    // Setup ALL listeners - let the device decide which one sends data
    await Promise.all([
      this._setupTuyaDPMode().catch(e => this.log('[HYBRID] Tuya DP setup skipped:', e.message)),
      this._setupZCLMode(zclNode).catch(e => this.log('[HYBRID] ZCL setup skipped:', e.message)),
      this._setupIASZoneListeners(zclNode).catch(e => this.log('[HYBRID] IAS Zone setup skipped:', e.message))
    ]);

    this.log('[HYBRID] ✅ All protocol listeners active - waiting for ANY data');

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: Initialize value storage and smart optimization timer
    // ─────────────────────────────────────────────────────────────────────────
    this._sensorValues = {};
    this._lastUpdate = null;

    // After 4 hours, log which protocols actually sent data (for debugging)
    this._optimizationTimer = this.homey.setTimeout(() => {
      this._logProtocolStats();
    }, 4 * 60 * 60 * 1000); // 4 hours

    // v5.5.30: Delayed data retry - if no data received after 4 minutes, force query
    this._setupDelayedDataRetry();

    // v5.5.31: Initialize comprehensive DataRecoveryManager
    this._initDataRecoveryManager();

    // v5.5.33: Initialize HybridDataQuery for TRUE HYBRID (ZCL + Tuya)
    this._initHybridDataQuery();

    this.log('[HYBRID-SENSOR] ✅ Initialization complete - TRUE HYBRID MODE');
  }

  /**
   * v5.5.401: FAST INIT MODE for sleepy battery devices
   * Optimized initialization that completes quickly before device goes to sleep
   *
   * Problem: Smoke detectors and other sleepy devices go to sleep ~3-5 seconds
   * after pairing. Complex initialization causes timeout and pairing failure.
   *
   * Solution: Minimal essential setup first, defer complex initialization
   */
  async _fastInit(zclNode) {
    this.log('[FAST-INIT] ════════════════════════════════════════════════════════');
    this.log('[FAST-INIT] ⚡ FAST INITIALIZATION for sleepy device');
    this.log('[FAST-INIT] ════════════════════════════════════════════════════════');

    // STEP 1: Quick protocol detection (no network calls)
    this._protocolInfo = this._detectProtocol();
    this.log(`[FAST-INIT] Protocol: ${this._protocolInfo.protocol}`);

    // STEP 2: Quick cluster detection (local only)
    this._detectAvailableClusters();

    // STEP 3: Essential listeners ONLY (IAS Zone for smoke/alarm)
    try {
      await this._setupIASZoneListeners(zclNode);
      this.log('[FAST-INIT] ✅ IAS Zone listeners ready');
    } catch (e) {
      this.log(`[FAST-INIT] ⚠️ IAS Zone setup skipped: ${e.message}`);
    }

    // STEP 4: Tuya DP listeners (essential for TS0601 devices)
    try {
      await this._setupTuyaDPMode();
      this.log('[FAST-INIT] ✅ Tuya DP listeners ready');
    } catch (e) {
      this.log(`[FAST-INIT] ⚠️ Tuya DP setup skipped: ${e.message}`);
    }

    // STEP 5: Mark as ready immediately
    this._sensorValues = {};
    this._lastUpdate = null;
    this._protocolStats = {
      tuyaDP: { received: 0, lastTime: null },
      zcl: { received: 0, lastTime: null },
      iasZone: { received: 0, lastTime: null },
      raw: { received: 0, lastTime: null }
    };

    this.log('[FAST-INIT] ✅ Essential initialization complete');

    // STEP 6: DEFER complex initialization (runs after device is paired)
    this.homey.setTimeout(async () => {
      this.log('[FAST-INIT] ⏳ Starting deferred initialization...');
      try {
        // Manufacturer config
        await this._applyManufacturerConfig?.();

        // ZCL mode setup
        await this._setupZCLMode?.(zclNode).catch(e =>
          this.log(`[FAST-INIT-DEFERRED] ZCL setup: ${e.message}`)
        );

        // Capability migration
        await this._migrateCapabilities?.();

        // Data recovery
        this._initDataRecoveryManager?.();
        this._initHybridDataQuery?.();

        this.log('[FAST-INIT] ✅ Deferred initialization complete');
      } catch (err) {
        this.log(`[FAST-INIT] ⚠️ Deferred init error: ${err.message}`);
      }
    }, 10000); // 10 seconds after pairing
  }

  /**
   * v5.5.340: MEMORY LEAK PREVENTION - Cleanup lifecycle method
   * Inspired by JohanBendz/com.philips.hue.zigbee PR#679
   *
   * - Clear all timeouts to prevent orphaned timers
   * - Remove event listeners to prevent memory leaks
   * - Clean up protocol optimizer and data handlers
   */
  async onUninit() {
    this.log('[HYBRID-SENSOR] 🧹 onUninit() - Cleaning up resources...');

    // Clear optimization timer
    if (this._optimizationTimer) {
      this.homey.clearTimeout(this._optimizationTimer);
      this._optimizationTimer = null;
      this.log('[CLEANUP] ✓ Cleared optimization timer');
    }

    // Clear delayed data retry timer
    if (this._delayedRetryTimer) {
      this.homey.clearTimeout(this._delayedRetryTimer);
      this._delayedRetryTimer = null;
      this.log('[CLEANUP] ✓ Cleared delayed retry timer');
    }

    // Clear any motion alarm timeouts
    if (this._motionAlarmTimeout) {
      this.homey.clearTimeout(this._motionAlarmTimeout);
      this._motionAlarmTimeout = null;
      this.log('[CLEANUP] ✓ Cleared motion alarm timeout');
    }

    // Clear suppress timeout (for occupancy sensors)
    if (this._suppressTimeout) {
      this.homey.clearTimeout(this._suppressTimeout);
      this._suppressTimeout = null;
      this.log('[CLEANUP] ✓ Cleared suppress timeout');
    }

    // Cleanup Protocol Auto-Optimizer
    if (this.protocolOptimizer) {
      this.protocolOptimizer.removeAllListeners?.();
      this.protocolOptimizer = null;
      this.log('[CLEANUP] ✓ Cleaned up Protocol Auto-Optimizer');
    }

    // Cleanup Universal Data Handler
    if (this.universalDataHandler) {
      this.universalDataHandler.removeAllListeners?.();
      this.universalDataHandler = null;
      this.log('[CLEANUP] ✓ Cleaned up Universal Data Handler');
    }

    // Cleanup DataRecoveryManager
    if (this._dataRecoveryManager) {
      this._dataRecoveryManager.stop?.();
      this._dataRecoveryManager = null;
      this.log('[CLEANUP] ✓ Cleaned up Data Recovery Manager');
    }

    // Cleanup HybridDataQuery
    if (this._hybridDataQuery) {
      this._hybridDataQuery = null;
      this.log('[CLEANUP] ✓ Cleaned up Hybrid Data Query');
    }

    // Clear stored references
    this.zclNode = null;
    this._sensorValues = null;
    this._protocolStats = null;

    this.log('[HYBRID-SENSOR] 🧹 Cleanup complete - all resources released');
  }

  /**
   * v5.5.630: SDK3 BEST PRACTICE - Configure attribute reporting for sleepy devices
   * Source: apps.developer.homey.app/wireless/zigbee#attribute-reporting
   * 
   * Configures periodic attribute reporting so sleepy devices send heartbeats
   * to Homey, allowing detection of unresponsive devices.
   */
  async _configureAttributeReportingSDK3(zclNode) {
    this.log('[SDK3] 📊 Configuring attribute reporting for sleepy device...');
    
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    // Temperature measurement cluster (0x0402)
    if (ep1.clusters?.temperatureMeasurement) {
      try {
        await this.configureAttributeReporting([
          {
            endpointId: 1,
            cluster: 'temperatureMeasurement',
            attributeName: 'measuredValue',
            minInterval: 60,      // Min 1 minute
            maxInterval: 3600,    // Max 1 hour  
            minChange: 10,        // Report on 0.1°C change
          }
        ]);
        this.log('[SDK3] ✅ Temperature reporting configured');
      } catch (e) {
        this.log(`[SDK3] ⚠️ Temperature reporting: ${e.message}`);
      }
    }

    // Relative humidity cluster (0x0405)
    if (ep1.clusters?.relativeHumidity) {
      try {
        await this.configureAttributeReporting([
          {
            endpointId: 1,
            cluster: 'relativeHumidity',
            attributeName: 'measuredValue',
            minInterval: 60,
            maxInterval: 3600,
            minChange: 100,       // Report on 1% change
          }
        ]);
        this.log('[SDK3] ✅ Humidity reporting configured');
      } catch (e) {
        this.log(`[SDK3] ⚠️ Humidity reporting: ${e.message}`);
      }
    }

    // Battery cluster (0x0001)
    if (ep1.clusters?.powerConfiguration) {
      try {
        await this.configureAttributeReporting([
          {
            endpointId: 1,
            cluster: 'powerConfiguration',
            attributeName: 'batteryPercentageRemaining',
            minInterval: 3600,    // Min 1 hour
            maxInterval: 43200,   // Max 12 hours
            minChange: 2,         // Report on 1% change (value is 0-200)
          }
        ]);
        this.log('[SDK3] ✅ Battery reporting configured');
      } catch (e) {
        this.log(`[SDK3] ⚠️ Battery reporting: ${e.message}`);
      }
    }

    // IAS Zone cluster (0x0500) - for motion/contact/smoke sensors
    if (ep1.clusters?.iasZone) {
      try {
        await this.configureAttributeReporting([
          {
            endpointId: 1,
            cluster: 'iasZone',
            attributeName: 'zoneStatus',
            minInterval: 0,       // Report immediately
            maxInterval: 3600,    // Max 1 hour heartbeat
            minChange: 1,         // Any change
          }
        ]);
        this.log('[SDK3] ✅ IAS Zone reporting configured');
      } catch (e) {
        this.log(`[SDK3] ⚠️ IAS Zone reporting: ${e.message}`);
      }
    }

    this.log('[SDK3] 📊 Attribute reporting configuration complete');
  }

  /**
   * v5.6.0: Applique la configuration dynamique basée sur manufacturerName
   */
  async _applyManufacturerConfig() {
    const manufacturerName = this.getData()?.manufacturerName || 'unknown';
    const productId = this.getData()?.productId || 'unknown';
    const driverType = this.driver?.id || 'unknown_sensor';

    this.log(`[SENSOR] 🔍 Analyzing config for: ${manufacturerName} / ${productId} (${driverType})`);

    // Get dynamic configuration
    const config = ManufacturerVariationManager.getManufacturerConfig(
      manufacturerName,
      productId,
      driverType
    );

    // Apply configuration
    ManufacturerVariationManager.applyManufacturerConfig(this, config);

    // Override DP mappings if dynamic ones are provided
    if (config.dpMappings && Object.keys(config.dpMappings).length > 0) {
      this._dynamicDpMappings = config.dpMappings;
      this.log(`[SENSOR] 🔄 Using dynamic DP mappings: ${Object.keys(config.dpMappings).join(', ')}`);
    }

    this.log(`[SENSOR] ⚙️ Protocol: ${config.protocol}`);
    this.log(`[SENSOR] 🔌 Endpoints: ${Object.keys(config.endpoints).join(', ')}`);
    this.log(`[SENSOR] 📡 ZCL Clusters: ${config.zclClusters.join(', ')}`);

    if (config.specialHandling) {
      this.log(`[SENSOR] ⭐ Special handling: ${config.specialHandling}`);
    }
  }

  /**
   * v5.5.196: Z2M-style queryOnDeviceAnnounce
   *
   * When a sleepy device wakes up and announces itself, immediately send
   * a dataQuery to request all DPs. This is CRITICAL for battery sensors
   * like climate sensors that only wake periodically.
   *
   * Source: https://www.zigbee2mqtt.io/advanced/support-new-devices/02_support_new_tuya_devices.html
   * tuya.onEvent({queryOnDeviceAnnounce: true})
   */
  async onEndDeviceAnnounce() {
    this.log('[SENSOR-WAKE] ════════════════════════════════════════════════════');
    this.log('[SENSOR-WAKE] 🔔 END DEVICE ANNOUNCE - Sleepy sensor woke up!');
    this.log('[SENSOR-WAKE] ════════════════════════════════════════════════════');

    // v5.5.196: Query ALL DPs immediately when device wakes
    try {
      await this._sendDataQueryOnWake();
    } catch (e) {
      this.log('[SENSOR-WAKE] ⚠️ dataQuery failed:', e.message);
    }

    // Also send time sync for LCD devices
    if (this._sendTimeSync) {
      try {
        this.log('[SENSOR-WAKE] 🕐 Sending time sync to LCD device...');
        await this._sendTimeSync();
      } catch (e) {
        this.log('[SENSOR-WAKE] ⚠️ Time sync failed:', e.message);
      }
    }

    // Call parent handler if exists
    if (super.onEndDeviceAnnounce) {
      await super.onEndDeviceAnnounce();
    }
  }

  /**
   * v5.5.196: Send dataQuery when device wakes up (Z2M style)
   * This triggers the device to report all its current values
   */
  async _sendDataQueryOnWake() {
    this.log('[SENSOR-WAKE] 📤 Sending dataQuery to request all DPs...');

    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[SENSOR-WAKE] ⚠️ No endpoint 1');
      return;
    }

    // Find Tuya cluster
    const tuyaCluster = endpoint.clusters?.tuya
      || endpoint.clusters?.manuSpecificTuya
      || endpoint.clusters?.[61184]
      || endpoint.clusters?.[0xEF00];

    if (tuyaCluster && typeof tuyaCluster.dataQuery === 'function') {
      try {
        await tuyaCluster.dataQuery({});
        this.log('[SENSOR-WAKE] ✅ dataQuery sent via cluster.dataQuery()');
        return;
      } catch (e) {
        // Try alternative method
      }
    }

    // Alternative: Send command directly
    if (tuyaCluster && typeof tuyaCluster.command === 'function') {
      try {
        await tuyaCluster.command('dataQuery', {});
        this.log('[SENSOR-WAKE] ✅ dataQuery sent via cluster.command()');
        return;
      } catch (e) {
        // Try next method
      }
    }

    // Use TuyaEF00Manager if available
    if (this.tuyaEF00Manager) {
      try {
        await this.tuyaEF00Manager.requestAllDPs?.();
        this.log('[SENSOR-WAKE] ✅ dataQuery sent via TuyaEF00Manager');
        return;
      } catch (e) {
        // Try fallback
      }
    }

    // Fallback: Request specific DPs from dpMappings
    const dpIds = Object.keys(this.dpMappings || {}).map(Number).filter(n => n > 0);
    if (dpIds.length > 0) {
      this.log(`[SENSOR-WAKE] ℹ️ Requesting specific DPs: ${dpIds.join(', ')}`);
      for (const dpId of dpIds) {
        await this.requestDP?.(dpId).catch(() => { });
        await new Promise(r => setTimeout(r, 100)); // Small delay between requests
      }
      this.log('[SENSOR-WAKE] ✅ DP requests sent');
    }
  }

  /**
   * v5.5.199: Hubitat-style packet tracking - register received packet
   * Called whenever data is received from the device
   */
  _registerRxPacket() {
    this._rxCounter = (this._rxCounter || 0) + 1;
    this._lastRxTimestamp = Date.now();

    // Mark device as available if it was offline
    if (this.getAvailable && !this.getAvailable()) {
      this.setAvailable().catch(() => { });
      this.log('[HEALTH] ✅ Device back online (packet received)');
    }
  }

  /**
   * v5.5.353: Handle battery DP updates with sanity checks and spam prevention
   * DPs 4, 14, 15, 100, 101 commonly used for battery reporting
   * Added throttling for ZG-204ZM devices that spam battery reports
   */
  _handleBatteryDP(dp, value) {
    if (typeof value === 'number' && value >= 0 && value <= 100) {
      // v5.5.366: GLOBAL battery throttling for ALL devices (4x4_Pete forum #851)
      // Prevents "battery spam" on devices that report battery with every DP
      const current = this.getCapabilityValue('measure_battery');
      const lastBatteryReport = this._lastBatteryReport || 0;
      const now = Date.now();
      const timeSinceLastReport = now - lastBatteryReport;
      const batteryChange = Math.abs((current || 0) - value);

      // v5.5.366: Global throttle - report if:
      // 1. Battery changed by >= 5% (significant change)
      // 2. OR more than 5 minutes since last report (allow periodic updates)
      // 3. OR this is the first report (lastBatteryReport === 0)
      const THROTTLE_MS = 300000;  // 5 minutes
      const SIGNIFICANT_CHANGE = 5;  // 5% change threshold

      if (batteryChange >= SIGNIFICANT_CHANGE || timeSinceLastReport > THROTTLE_MS || lastBatteryReport === 0) {
        this.log(`[BATTERY] 🔋 Battery: ${value}% (change: ${batteryChange}%, interval: ${Math.round(timeSinceLastReport / 1000)}s)`);
        this.setCapabilityValue('measure_battery', parseFloat(value)).catch(() => { });
        this._lastBatteryReport = now;
      } else {
        // Suppress spam - don't log to reduce noise
      }
    }
  }

  /**
   * v5.5.199: Hubitat-style packet tracking - register transmitted packet
   * Called whenever we send a command to the device
   */
  _registerTxPacket() {
    this._txCounter = (this._txCounter || 0) + 1;
    this._lastTxTimestamp = Date.now();
  }

  /**
   * v5.5.199: SmartThings-style battery enum conversion
   * Converts Tuya battery state enum to percentage
   * @param {number} enumValue - Battery enum (0=low, 1=medium, 2=high)
   * @returns {number} Battery percentage
   */
  _convertBatteryEnum(enumValue) {
    const map = this.batteryEnumMap || { 0: 10, 1: 50, 2: 100 };
    return map[enumValue] ?? enumValue;
  }

  /**
   * v5.5.33: Initialize HybridDataQuery for BOTH ZCL and Tuya queries
   */
  async _initHybridDataQuery() {
    try {
      this._hybridDataQuery = new HybridDataQuery(this);
      await this._hybridDataQuery.initialize();
      this.log('[HYBRID-QUERY] ✅ HybridDataQuery initialized');

      // Schedule capability/method status log after 30 min
      this._scheduleCapabilityStatusLog();
    } catch (err) {
      this.log('[HYBRID-QUERY] Init failed:', err.message);
    }
  }

  /**
   * v5.5.33: Schedule capability status log after 30 minutes
   * This helps debug which data is missing and why
   */
  _scheduleCapabilityStatusLog() {
    this._capabilityStatusTimer = this.homey.setTimeout(async () => {
      this.log('');
      this.log('═══════════════════════════════════════════════════════════════');
      this.log('📊 CAPABILITY STATUS REPORT (30 min after init)');
      this.log('═══════════════════════════════════════════════════════════════');

      // Get all capabilities
      const caps = this.getCapabilities();
      const missing = [];
      const present = [];

      for (const cap of caps) {
        const value = this.getCapabilityValue(cap);
        if (value === null || value === undefined) {
          missing.push(cap);
        } else {
          present.push(`${cap}=${value}`);
        }
      }

      this.log(`✅ Present (${present.length}): ${present.join(', ')}`);
      this.log(`❌ Missing (${missing.length}): ${missing.join(', ')}`);

      // Log protocol stats
      if (this._protocolStats) {
        this.log('📡 Protocol stats:');
        for (const [proto, stats] of Object.entries(this._protocolStats)) {
          if (stats && typeof stats.received !== 'undefined') {
            this.log(`   ${proto}: ${stats.received} messages`);
          } else {
            this.log(`   ${proto}: no data`);
          }
        }
      }

      // Log available clusters
      if (this._hybridDataQuery?.zigbeeQuery) {
        await this._hybridDataQuery.zigbeeQuery.logClusterInfo();
      }

      // If still missing data, force query
      if (missing.length > 0) {
        this.log('🔄 Forcing hybrid query for missing data...');
        await this._hybridDataQuery?.forceQuery?.().catch(() => { });
      }

      this.log('═══════════════════════════════════════════════════════════════');
      this.log('');
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * v5.5.31: Initialize DataRecoveryManager for comprehensive data recovery
   */
  _initDataRecoveryManager() {
    try {
      this._dataRecoveryManager = new DataRecoveryManager(this, {
        maxRetries: 5,
        verbose: true,
        injectDefaults: true, // Inject defaults after multiple failures
      });
      this._dataRecoveryManager.initialize();
      this.log('[HYBRID-SENSOR] ✅ DataRecoveryManager initialized');
    } catch (err) {
      this.log('[HYBRID-SENSOR] DataRecoveryManager init failed:', err.message);
    }
  }

  /**
   * v5.5.30: Setup delayed data retry
   * If no data is received 4 minutes after pairing, force a DP query
   * This ensures sleepy devices report their values
   */
  _setupDelayedDataRetry() {
    const RETRY_DELAY = 4 * 60 * 1000; // 4 minutes

    this._dataRetryTimer = this.homey.setTimeout(async () => {
      this.log('[DATA-RETRY] ⏰ 4 minutes passed - checking for missing data...');

      // Check which capabilities are still null/undefined
      const missingCaps = this._checkMissingCapabilities();

      if (missingCaps.length > 0) {
        this.log(`[DATA-RETRY] ⚠️ Missing data for: ${missingCaps.join(', ')}`);
        this.log('[DATA-RETRY] 🔄 Forcing data query...');

        // Try multiple strategies to get data
        await this._forceDataRetry();
      } else {
        this.log('[DATA-RETRY] ✅ All capabilities have values - no retry needed');
      }
    }, RETRY_DELAY);

    this.log('[DATA-RETRY] ⏱️ Scheduled data check in 4 minutes');
  }

  /**
   * v5.5.30: Check which capabilities are missing values
   */
  _checkMissingCapabilities() {
    const missing = [];
    const capsToCheck = ['measure_temperature', 'measure_humidity', 'measure_battery'];

    for (const cap of capsToCheck) {
      if (this.hasCapability(cap)) {
        const value = this.getCapabilityValue(cap);
        if (value === null || value === undefined) {
          missing.push(cap);
        }
      }
    }

    return missing;
  }

  /**
   * v5.5.30: Force data retrieval using all available methods
   */
  async _forceDataRetry() {
    try {
      // Method 1: Query all DPs from dpMappings
      const dpIds = Object.keys(this.dpMappings || {}).map(Number).filter(n => !isNaN(n));
      if (dpIds.length > 0 && this.tuyaDataQuery) {
        this.log(`[DATA-RETRY] 📡 Querying ${dpIds.length} DPs: [${dpIds.join(', ')}]`);
        await this.tuyaDataQuery(dpIds, {
          logPrefix: '[DATA-RETRY]',
          delayBetweenQueries: 100,
        }).catch(() => { });
      }

      // Method 2: Direct ZCL attribute reads
      await this._readZCLAttributes().catch(() => { });

      // Method 3: Refresh bindings
      await this._refreshClusterBindings().catch(() => { });

      // Schedule another check in 2 minutes
      this._scheduleSecondRetry();

    } catch (err) {
      this.log('[DATA-RETRY] Error:', err.message);
    }
  }

  /**
   * v5.5.30: Read ZCL attributes directly
   */
  async _readZCLAttributes() {
    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    this.log('[DATA-RETRY] 📖 Reading ZCL attributes...');

    // Temperature
    const tempCluster = endpoint.clusters?.temperatureMeasurement;
    if (tempCluster?.readAttributes) {
      try {
        const data = await tempCluster.readAttributes(['measuredValue']);
        if (data?.measuredValue != null) {
          const temp = data.measuredValue / 100;
          this.log(`[DATA-RETRY] 🌡️ Got temperature: ${temp}°C`);
          await this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
        }
      } catch (e) { /* silent */ }
    }

    // Humidity
    const humCluster = endpoint.clusters?.relativeHumidityMeasurement;
    if (humCluster?.readAttributes) {
      try {
        const data = await humCluster.readAttributes(['measuredValue']);
        if (data?.measuredValue != null) {
          const hum = data.measuredValue / 100;
          this.log(`[DATA-RETRY] 💧 Got humidity: ${hum}%`);
          await this.setCapabilityValue('measure_humidity', parseFloat(hum)).catch(() => { });
        }
      } catch (e) { /* silent */ }
    }

    // Battery - v5.5.103: Enhanced with fallback strategies (Peter's fix)
    await this._readBatteryWithFallback(endpoint);
  }

  /**
   * v5.5.103: Enhanced battery reading with multiple fallback strategies
   * (Peter's fix from SOS button - now global for ALL battery devices)
   */
  async _readBatteryWithFallback(endpoint) {
    const ep = endpoint || this.zclNode?.endpoints?.[1];
    const powerCluster = ep?.clusters?.powerConfiguration || ep?.clusters?.genPowerCfg;

    if (!powerCluster?.readAttributes) {
      this.log('[BATTERY] ⚠️ No powerConfiguration cluster available');
      return null;
    }

    // Strategy 1: batteryPercentageRemaining (standard ZCL)
    try {
      const result = await powerCluster.readAttributes(['batteryPercentageRemaining']);
      if (result?.batteryPercentageRemaining !== undefined && result.batteryPercentageRemaining !== 255) {
        const percent = Math.round(result.batteryPercentageRemaining / 2);
        this.log(`[BATTERY] 🔋 Strategy 1 (percentage): ${percent}%`);
        await this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
        return percent;
      }
    } catch (e) {
      this.log('[BATTERY] Strategy 1 failed, trying voltage...');
    }

    // Strategy 2: batteryVoltage (fallback)
    try {
      const result = await powerCluster.readAttributes(['batteryVoltage']);
      if (result?.batteryVoltage !== undefined && result.batteryVoltage > 0) {
        // Generic: 3.0V = 100%, 2.0V = 0% (CR2450/CR2032/CR123A common range)
        const voltage = result.batteryVoltage / 10;
        const percent = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
        this.log(`[BATTERY] 🔋 Strategy 2 (voltage): ${voltage}V → ${percent}%`);
        await this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
        return percent;
      }
    } catch (e) {
      this.log('[BATTERY] Strategy 2 (voltage) also failed');
    }

    // Strategy 3: Read all available battery attributes
    try {
      const allAttrs = await powerCluster.readAttributes([
        'batteryPercentageRemaining',
        'batteryVoltage',
        'batteryAlarmState'
      ]);
      this.log('[BATTERY] 🔋 All battery attrs:', JSON.stringify(allAttrs));

      if (allAttrs?.batteryPercentageRemaining !== undefined && allAttrs.batteryPercentageRemaining !== 255) {
        const percent = Math.round(allAttrs.batteryPercentageRemaining / 2);
        await this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
        return percent;
      }
    } catch (e) {
      // Silent - device may have gone back to sleep
    }

    return null;
  }

  /**
   * v5.5.30: Refresh cluster bindings
   */
  async _refreshClusterBindings() {
    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    this.log('[DATA-RETRY] 🔗 Refreshing bindings...');

    const clusters = [
      'temperatureMeasurement',
      'relativeHumidityMeasurement',
      'powerConfiguration',
    ];

    for (const clusterName of clusters) {
      const cluster = endpoint.clusters?.[clusterName];
      if (cluster?.bind) {
        try {
          await cluster.bind();
          this.log(`[DATA-RETRY] ✓ Bound ${clusterName}`);
        } catch (e) { /* silent */ }
      }
    }
  }

  /**
   * v5.5.30: Schedule a second retry after 2 more minutes if still missing data
   */
  _scheduleSecondRetry() {
    this._secondRetryTimer = this.homey.setTimeout(async () => {
      const stillMissing = this._checkMissingCapabilities();

      if (stillMissing.length > 0) {
        this.log(`[DATA-RETRY] ⚠️ Still missing after 6 min: ${stillMissing.join(', ')}`);
        this.log('[DATA-RETRY] 💥 Sending DP burst...');

        // Last resort: DP burst query
        const dpIds = Object.keys(this.dpMappings || {}).map(Number).filter(n => !isNaN(n));
        if (dpIds.length > 0 && this.tuyaDataQuery) {
          await this.tuyaDataQuery(dpIds, {
            logPrefix: '[DATA-RETRY-BURST]',
            delayBetweenQueries: 50,
          }).catch(() => { });
        }
      } else {
        this.log('[DATA-RETRY] ✅ All data received after retry');
      }
    }, 2 * 60 * 1000); // 2 more minutes
  }

  /**
   * Log protocol statistics after warmup period
   */
  _logProtocolStats() {
    this.log('[HYBRID] ════════════════════════════════════════════════════════');
    this.log('[HYBRID] 📊 Protocol Statistics (after 4h warmup):');
    if (this._protocolStats) {
      for (const [proto, stats] of Object.entries(this._protocolStats)) {
        if (stats && stats.received > 0) {
          this.log(`[HYBRID]   ✅ ${proto}: ${stats.received} messages received`);
        } else {
          this.log(`[HYBRID]   ⚪ ${proto}: no messages`);
        }
      }
    }
    this.log('[HYBRID] ════════════════════════════════════════════════════════');
  }

  /**
   * Setup IAS Zone listeners for contact/motion/water/smoke sensors
   * v5.5.600: Added IAS Zone enrollment handling for TS0203 and similar sensors
   */
  async _setupIASZoneListeners(zclNode) {
    this.log('[IAS] ════════════════════════════════════════════════════════');
    this.log('[IAS] v5.5.646: Setting up IAS Zone listeners...');
    
    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[IAS] ⚠️ No endpoint 1 found');
      return;
    }
    
    const iasCluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;
    if (!iasCluster) {
      this.log('[IAS] ⚠️ No IAS Zone cluster found on endpoint 1');
      return;
    }
    
    this.log('[IAS] ✅ IAS Zone cluster found');

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.601: ENHANCED IAS ZONE ENROLLMENT - Fix for HOBEIAN water sensors
    // Problem: Devices enrolled to old CIE address won't send notifications
    // Solution: Force re-write CIE address + handle enrollment requests
    // ═══════════════════════════════════════════════════════════════════════
    try {
      // Handle enrollment requests from the device
      if (typeof iasCluster.on === 'function') {
        iasCluster.on('zoneEnrollRequest', async (data) => {
          this.log('[IAS] 📥 Zone enroll request received:', data);
          try {
            // Respond with successful enrollment (enrollResponseCode: 0 = success, zoneId: 1)
            await iasCluster.zoneEnrollResponse({
              enrollResponseCode: 0, // Success
              zoneId: 1
            });
            this.log('[IAS] ✅ Zone enrollment response sent successfully');
          } catch (err) {
            this.log('[IAS] ⚠️ Zone enrollment response failed:', err.message);
          }
        });
      }

      // v5.5.776: CRITICAL FIX for HOBEIAN ZG-102Z and similar sensors (Forum Lasse_K)
      // Problem: Devices show CIE address 00:00:00:00:00:00:00:00 = NOT enrolled
      // Solution: Force enrollment using auto-enroll-response method
      // SDK3: Coordinator address is NOT directly accessible, use auto-enroll approach
      
      try {
        if (typeof iasCluster.readAttributes === 'function') {
          const cieAttrs = await iasCluster.readAttributes(['iasCieAddress', 'zoneState', 'zoneId']).catch(() => ({}));
          const currentCie = cieAttrs?.iasCieAddress;
          const zoneState = cieAttrs?.zoneState;
          const zoneId = cieAttrs?.zoneId;
          
          this.log(`[IAS] 📖 Current CIE: ${currentCie}, Zone state: ${zoneState}, Zone ID: ${zoneId}`);
          
          // v5.5.776: HOBEIAN FIX - Check for null/zero CIE address indicating enrollment failure
          const isNullCie = !currentCie || 
            currentCie === '00:00:00:00:00:00:00:00' ||
            currentCie === '0x0000000000000000' ||
            (typeof currentCie === 'string' && currentCie.replace(/[:\-0x]/g, '') === '0000000000000000');
          
          if (isNullCie) {
            this.log('[IAS] ⚠️ CIE address is NULL/ZERO - device NOT enrolled to Homey!');
            this.log('[IAS] 🔧 Attempting CIE address write + auto-enrollment...');
            
            // v5.5.790: INT-021 FIX - Force write CIE address for HOBEIAN ZG-102Z
            // Step 1: Try to get Homey's IEEE address and write it to the device
            try {
              // Get Homey's IEEE address from multiple sources
              let homeyIeee = null;
              
              // Method 1: From zclNode network info
              if (zclNode?.networkAddress?.ieeeAddr) {
                homeyIeee = zclNode.networkAddress.ieeeAddr;
              }
              // Method 2: From Homey's Zigbee manager (SDK3)
              if (!homeyIeee && this.homey?.zigbee?.ieeeAddress) {
                homeyIeee = this.homey.zigbee.ieeeAddress;
              }
              // Method 3: Use coordinator default address pattern
              if (!homeyIeee) {
                // Default Homey coordinator address format
                homeyIeee = '0x00124b0000000001';
              }
              
              this.log(`[IAS] 📝 Writing CIE address: ${homeyIeee}`);
              
              if (typeof iasCluster.writeAttributes === 'function') {
                await iasCluster.writeAttributes({ iasCieAddress: homeyIeee });
                this.log('[IAS] ✅ CIE address written successfully');
                
                // Wait for device to process
                await new Promise(r => setTimeout(r, 500));
              }
            } catch (cieWriteErr) {
              this.log(`[IAS] ⚠️ CIE address write failed: ${cieWriteErr.message}`);
            }
            
            // Step 2: Send enrollment response
            try {
              if (typeof iasCluster.zoneEnrollResponse === 'function') {
                await iasCluster.zoneEnrollResponse({
                  enrollResponseCode: 0, // Success
                  zoneId: 1
                });
                this.log('[IAS] ✅ Sent auto-enrollment response (zoneId: 1)');
              }
            } catch (enrollErr) {
              this.log(`[IAS] ⚠️ Auto-enrollment response failed: ${enrollErr.message}`);
            }
            
            // Step 3: Verify enrollment worked
            try {
              await new Promise(r => setTimeout(r, 1000));
              const verifyAttrs = await iasCluster.readAttributes(['iasCieAddress', 'zoneState']).catch(() => ({}));
              const newCie = verifyAttrs?.iasCieAddress;
              const newState = verifyAttrs?.zoneState;
              this.log(`[IAS] 📖 After enrollment: CIE=${newCie}, State=${newState}`);
              
              if (newState === 1 || newState === 'enrolled') {
                this.log('[IAS] ✅ Device now enrolled!');
                this._iasEnrollmentFailed = false;
                this.unsetWarning?.();
              } else {
                this._iasEnrollmentFailed = true;
                this.setWarning?.('IAS Zone enrollment may need re-pairing. Remove and re-add device if sensor not responding.');
              }
            } catch (verifyErr) {
              this.log(`[IAS] ⚠️ Verification failed: ${verifyErr.message}`);
              this._iasEnrollmentFailed = true;
              this.setWarning?.('IAS Zone enrollment may need re-pairing. Remove and re-add device if sensor not responding.');
            }
          } else {
            this.log('[IAS] ✅ CIE address present - device should be enrolled');
            this._iasEnrollmentFailed = false;
          }
        }
      } catch (e) {
        this.log(`[IAS] ⚠️ CIE check error: ${e.message}`);
      }

      // Try to read current zone status on init
      if (typeof iasCluster.readAttributes === 'function') {
        try {
          const attrs = await iasCluster.readAttributes(['zoneStatus', 'zoneState', 'zoneType']);
          this.log('[IAS] 📖 Initial zone attributes:', JSON.stringify(attrs));
          if (attrs?.zoneStatus !== undefined) {
            this._handleIASZoneStatus(attrs.zoneStatus);
          }
        } catch (e) {
          this.log('[IAS] ⚠️ Zone attributes read skipped:', e.message);
        }
      }
    } catch (enrollErr) {
      this.log('[IAS] ⚠️ Enrollment setup skipped:', enrollErr.message);
    }

    // Listen for zone status changes
    if (typeof iasCluster.on === 'function') {
      iasCluster.on('attr.zoneStatus', (status) => {
        this._protocolStats.iasZone.received++;
        this._protocolStats.iasZone.lastTime = Date.now();
        this.log(`[IAS] 📥 Zone status: ${status}`);
        this._handleIASZoneStatus(status);
      });

      iasCluster.on('zoneStatusChangeNotification', (data) => {
        this._protocolStats.iasZone.received++;
        this._protocolStats.iasZone.lastTime = Date.now();
        this.log(`[IAS] 📥 Zone notification: ${JSON.stringify(data)}`);
        // v5.5.645: Handle both direct and nested zoneStatus
        const status = data?.zoneStatus ?? data?.payload?.zoneStatus ?? data;
        this._handleIASZoneStatus(status);
      });
    }

    this.log('[IAS] ✅ IAS Zone listeners active (with enrollment support)');
  }

  /**
   * Handle IAS Zone status (contact, motion, water, smoke, gas, CO, vibration, SOS)
   * v5.5.143: Context-aware mapping based on manufacturerName/driverType
   * v5.5.549: FIX Lasse_K - Water leak sensors may use alarm1 OR alarm2
   * v5.5.601: FIX Buffer handling for zone status (HOBEIAN sensors)
   */
  _handleIASZoneStatus(status) {
    // v5.5.601: Handle Buffer format (some devices return Buffer instead of number)
    let statusValue = status;
    if (status && typeof status === 'object') {
      if (Buffer.isBuffer(status)) {
        // Buffer: [lowByte, highByte] → combine to 16-bit value
        statusValue = status.length >= 2 ? (status[1] << 8) | status[0] : status[0] || 0;
        this.log(`[IAS] 🔄 Converted Buffer [${Array.from(status).join(',')}] → ${statusValue}`);
      } else if (status.type === 'Buffer' && Array.isArray(status.data)) {
        // JSON Buffer format: { type: 'Buffer', data: [0, 0] }
        const data = status.data;
        statusValue = data.length >= 2 ? (data[1] << 8) | data[0] : data[0] || 0;
        this.log(`[IAS] 🔄 Converted JSON Buffer [${data.join(',')}] → ${statusValue}`);
      } else if (typeof status.value === 'number') {
        statusValue = status.value;
      } else if (typeof status.zoneStatus === 'number') {
        // v5.5.645: Handle {zoneStatus: X} from zoneStatusChangeNotification
        statusValue = status.zoneStatus;
        this.log(`[IAS] 🔄 Extracted zoneStatus → ${statusValue}`);
      }
    }
    
    // v5.5.645: Ensure statusValue is a number
    if (typeof statusValue !== 'number') {
      statusValue = parseInt(statusValue, 10) || 0;
    }
    
    const alarm1 = (statusValue & 0x01) !== 0; // Bit 0: Zone alarm 1
    const alarm2 = (statusValue & 0x02) !== 0; // Bit 1: Zone alarm 2
    const tamper = (statusValue & 0x04) !== 0; // Bit 2: Tamper
    const battery = (statusValue & 0x08) !== 0; // Bit 3: Battery low

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.143: CONTEXT-AWARE IAS ZONE MAPPING
    // Get correct capability based on manufacturerName/driverType
    // ═══════════════════════════════════════════════════════════════════════
    const mfr = this._protocolInfo?.mfr || this.getSetting('zb_manufacturer_name') || '';
    const driverType = this.driver?.id || '';

    // Get the correct capability for alarm1 based on device type
    const primaryCapability = getIasZoneCapability(mfr, driverType);

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.549: FIX - Some sensors use alarm2 instead of alarm1
    // Water leak sensors: Some use bit 0, some use bit 1, some use both
    // Smoke/Gas/CO sensors: Same issue
    // Solution: Use alarm1 OR alarm2 for these sensor types
    // ═══════════════════════════════════════════════════════════════════════
    const usesBothAlarmBits = ['alarm_water', 'alarm_smoke', 'alarm_gas', 'alarm_co'].includes(primaryCapability);
    const alarmValue = usesBothAlarmBits ? (alarm1 || alarm2) : alarm1;

    // v5.5.645: FIX - use statusValue (number) not status (may be Buffer/object)
    this.log(`[IAS-CTX] 🎯 Zone status=${statusValue} (0x${statusValue.toString(16)}) → ${primaryCapability}=${alarmValue} (alarm1=${alarm1}, alarm2=${alarm2}, mfr: ${mfr})`);

    // Set the primary alarm capability
    if (this.hasCapability(primaryCapability)) {
      this._safeSetCapability(primaryCapability, alarmValue);
    } else {
      // Fallback: try all known alarm capabilities
      const fallbackCaps = ['alarm_contact', 'alarm_motion', 'alarm_water', 'alarm_smoke', 'alarm_gas', 'alarm_co', 'alarm_vibration', 'alarm_sos'];
      for (const cap of fallbackCaps) {
        if (this.hasCapability(cap)) {
          const usesBoth = ['alarm_water', 'alarm_smoke', 'alarm_gas', 'alarm_co'].includes(cap);
          const value = usesBoth ? (alarm1 || alarm2) : alarm1;
          this._safeSetCapability(cap, value);
          this.log(`[IAS-CTX] 📝 Fallback: ${cap}=${value}`);
          break;
        }
      }
    }

    // Tamper is universal
    if (this.hasCapability('alarm_tamper')) {
      this._safeSetCapability('alarm_tamper', tamper);
    }

    // Battery low is universal
    if (this.hasCapability('alarm_battery') && battery) {
      this._safeSetCapability('alarm_battery', battery);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOCOL DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  _detectProtocol() {
    try {
      // v5.5.735: Use DeviceDataHelper for consistent manufacturer/model retrieval
      const modelId = getModelId(this) || '';
      const mfr = getManufacturer(this) || '';

      // ═══════════════════════════════════════════════════════════════════════
      // v5.3.92: CRITICAL FIX - Also check for Tuya cluster presence
      // On firstInit, settings may be empty but cluster is already available!
      // ═══════════════════════════════════════════════════════════════════════
      let hasTuyaCluster = false;
      try {
        const ep1 = this.zclNode?.endpoints?.[1];
        if (ep1?.clusters) {
          const clusterKeys = Object.keys(ep1.clusters);
          hasTuyaCluster = clusterKeys.some(k =>
            k === 'tuya' ||
            k === 'manuSpecificTuya' ||
            k === '61184' ||
            k === 'ef00' ||
            parseInt(k) === 61184 ||
            parseInt(k) === 0xEF00
          );
          if (hasTuyaCluster) {
            this.log('[PROTOCOL] ✅ Tuya cluster (0xEF00) detected on endpoint 1');
          }
        }
      } catch (e) { /* ignore */ }

      // Tuya DP devices: TS0601, _TZE* manufacturers, OR has Tuya cluster
      const isTuyaDP = modelId === 'TS0601' || mfr.startsWith('_TZE') || hasTuyaCluster;

      // Standard ZCL: TS0201, SNZB, SONOFF (but NOT if Tuya cluster is present)
      const isSONOFF = mfr === 'SONOFF' || mfr === 'eWeLink' || modelId.startsWith('SNZB');
      const isStandardZCL = (modelId === 'TS0201' || modelId.startsWith('TS02') || isSONOFF) && !isTuyaDP;

      return {
        protocol: isTuyaDP ? 'TUYA_DP' : 'ZCL',
        isTuyaDP,
        isStandardZCL,
        isSONOFF,
        hasTuyaCluster,
        modelId,
        mfr
      };
    } catch (err) {
      this.error('[PROTOCOL] Detection error:', err.message);
      // Default to Tuya DP (safer - avoids ZCL timeouts)
      return { protocol: 'TUYA_DP', isTuyaDP: true, isStandardZCL: false, modelId: '', mfr: '' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.103: DYNAMIC CLUSTER DETECTION (Peter's fix - global)
  // Detects which ZCL clusters are actually available on the device
  // ═══════════════════════════════════════════════════════════════════════════

  _detectAvailableClusters() {
    const ep1 = this.zclNode?.endpoints?.[1];

    // Store detected clusters
    this._availableClusters = {
      temperature: !!(ep1?.clusters?.temperatureMeasurement || ep1?.clusters?.msTemperatureMeasurement),
      humidity: !!(ep1?.clusters?.relativeHumidity || ep1?.clusters?.relativeHumidityMeasurement || ep1?.clusters?.msRelativeHumidity),
      illuminance: !!(ep1?.clusters?.illuminanceMeasurement || ep1?.clusters?.msIlluminanceMeasurement),
      battery: !!(ep1?.clusters?.powerConfiguration || ep1?.clusters?.genPowerCfg),
      occupancy: !!(ep1?.clusters?.occupancySensing || ep1?.clusters?.msOccupancySensing),
      iasZone: !!(ep1?.clusters?.iasZone || ep1?.clusters?.ssIasZone),
      pressure: !!(ep1?.clusters?.pressureMeasurement || ep1?.clusters?.msPressureMeasurement),
      onOff: !!(ep1?.clusters?.onOff || ep1?.clusters?.genOnOff),
      tuya: !!(ep1?.clusters?.tuya || ep1?.clusters?.manuSpecificTuya || ep1?.clusters?.[61184])
    };

    this.log('[CLUSTERS] Detected clusters:', JSON.stringify(this._availableClusters));
    return this._availableClusters;
  }

  /** v5.5.103: Check if device has a specific cluster */
  hasCluster(clusterName) {
    if (!this._availableClusters) this._detectAvailableClusters();
    return this._availableClusters?.[clusterName] || false;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY MIGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  async _migrateCapabilities() {
    // v5.5.103: Detect clusters first
    if (!this._availableClusters) this._detectAvailableClusters();

    const requiredCaps = this.sensorCapabilities;

    for (const cap of requiredCaps) {
      // v5.5.103: Skip capabilities if cluster not available (prevents timeouts)
      if (this._shouldSkipCapability(cap)) {
        this.log(`[MIGRATE] ⏭️ Skipping ${cap} - cluster not available`);
        continue;
      }

      if (!this.hasCapability(cap)) {
        try {
          await this.addCapability(cap);
          this.log(`[MIGRATE] ➕ Added capability: ${cap}`);
        } catch (err) {
          this.log(`[MIGRATE] ⚠️ Could not add ${cap}: ${err.message}`);
        }
      }
    }
  }

  /** v5.5.103: Check if capability should be skipped (cluster not available) */
  _shouldSkipCapability(capability) {
    // If Tuya DP device, don't skip (DPs may provide data)
    if (this._protocolInfo?.isTuyaDP) return false;

    // Map capabilities to required clusters
    const capToCluster = {
      'measure_temperature': 'temperature',
      'measure_humidity': 'humidity',
      'measure_luminance': 'illuminance',
      'measure_pressure': 'pressure',
      'alarm_motion': 'occupancy',
      'alarm_contact': 'iasZone'
    };

    const requiredCluster = capToCluster[capability];
    if (!requiredCluster) return false; // Unknown capability, don't skip

    return !this.hasCluster(requiredCluster);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAX LISTENERS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  _bumpMaxListeners(zclNode) {
    try {
      const max = this.maxListeners;

      if (!zclNode?.endpoints) return;

      // v5.5.57: Log Green Power analysis and filter usable endpoints
      greenPower.logEndpointAnalysis(zclNode, this.log.bind(this));
      const usableEndpoints = greenPower.getUsableEndpoints(zclNode);

      for (const { id: endpointId, endpoint } of usableEndpoints) {
        // Bump endpoint
        if (endpoint && typeof endpoint.setMaxListeners === 'function') {
          endpoint.setMaxListeners(max);
        }

        // Bump all clusters
        if (endpoint?.clusters) {
          for (const cluster of Object.values(endpoint.clusters)) {
            if (cluster && typeof cluster.setMaxListeners === 'function') {
              cluster.setMaxListeners(max);
            }
          }
        }
      }

      // Bump zclNode itself
      if (typeof zclNode.setMaxListeners === 'function') {
        zclNode.setMaxListeners(max);
      }

      this.log(`[LISTENERS] ✅ MaxListeners set to ${max} on ${usableEndpoints.length} usable endpoints`);
    } catch (err) {
      this.log('[LISTENERS] Error:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TUYA DP MODE (EF00 cluster)
  // ═══════════════════════════════════════════════════════════════════════════

  async _setupTuyaDPMode() {
    this.log('[TUYA-DP] ════════════════════════════════════════════════════');
    this.log('[TUYA-DP] Setting up Tuya DataPoint mode via TuyaEF00Manager');
    this.log('[TUYA-DP] ════════════════════════════════════════════════════');

    // Log DP mappings for debugging
    const dpKeys = Object.keys(this.dpMappings);
    this.log(`[TUYA-DP] DP mappings: ${dpKeys.join(', ')}`);

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.194: CRITICAL - Setup LOW-LEVEL NODE handleFrame FIRST!
    // This is the ONLY reliable way to receive 0xEF00 frames from TS0601
    // devices that don't announce the cluster during interview.
    // Without this, TuyaEF00Manager passive mode may not receive any data!
    // ═══════════════════════════════════════════════════════════════════════
    await this._setupLowLevelNodeHandler();

    // ═══════════════════════════════════════════════════════════════════════
    // v5.3.72: CRITICAL FIX - Use TuyaEF00Manager (the REAL solution)
    // This manager properly handles cluster detection, event listeners, etc.
    // ═══════════════════════════════════════════════════════════════════════
    try {
      this.tuyaEF00Manager = new TuyaEF00Manager(this);
      const initialized = await this.tuyaEF00Manager.initialize(this.zclNode);

      if (initialized) {
        this.log('[TUYA-DP] ✅ TuyaEF00Manager initialized successfully');

        // Listen for DP reports from the manager
        this.tuyaEF00Manager.on('dpReport', (data) => {
          this.log(`[TUYA-DP] 📥 dpReport: DP${data.dpId} = ${data.value}`);
          this._handleDP(data.dpId, data.value);
        });

        // Listen for individual DP events
        for (const dpId of dpKeys) {
          this.tuyaEF00Manager.on(`dp-${dpId}`, (value) => {
            this.log(`[TUYA-DP] 📥 dp-${dpId} event: ${value}`);
            this._handleDP(parseInt(dpId), value);
          });
        }

        this.log('[TUYA-DP] ✅ DP event listeners registered');

        // v5.5.25: Send dataQuery to wake up sleepy devices
        // This command will be delivered when the device next wakes up
        await this._sendTuyaDataQuery().catch(e => {
          this.log('[TUYA-DP] ⚠️ Initial dataQuery skipped:', e.message);
        });

        // v5.5.25: Setup periodic dataQuery for sleepy devices (every 30 min)
        if (!this.mainsPowered) {
          this._startPeriodicDataQuery();
        }
      } else {
        this.log('[TUYA-DP] ⚠️ TuyaEF00Manager could not initialize - using fallback');
        this._setupTuyaClusterListenersFallback();
      }
    } catch (err) {
      this.error('[TUYA-DP] TuyaEF00Manager error:', err.message);
      this._setupTuyaClusterListenersFallback();
    }

    // v5.5.447: Setup mcuSyncTime handler for LCD time sync
    await this._setupTimeSyncBoundCluster();
  }

  /**
   * v5.5.447: Setup BoundCluster to listen for mcuSyncTime requests
   * This is CRITICAL for LCD climate sensors like _TZE284_vvmbj46n (TH05Z)
   *
   * The device sends mcuSyncTime (0x24) to REQUEST time sync
   * We must LISTEN and RESPOND, not just send time proactively
   *
   * Reference: Z2M tuya.onEvent({queryOnDeviceAnnounce: true})
   */
  async _setupTimeSyncBoundCluster() {
    this.log('[TIME-SYNC] Setting up mcuSyncTime BoundCluster listener...');

    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[TIME-SYNC] ⚠️ No endpoint 1 available');
        return;
      }

      const device = this;

      // Create inline BoundCluster class with mcuSyncTime handler
      class TimeSyncBoundCluster {
        constructor() {
          // Required for BoundCluster
        }

        /**
         * MCU sync time (0x24) - device requests time
         * v5.5.456: Enhanced logging for diagnostics
         */
        mcuSyncTime(payload) {
          device.log('[TIME-SYNC] ════════════════════════════════════════');
          device.log('[TIME-SYNC] ⏰ mcuSyncTime REQUEST received from device!');
          device.log('[TIME-SYNC] 🟢 FIRMWARE IS COOPERATIVE - requesting time sync');
          device.log('[TIME-SYNC] Payload:', payload ? JSON.stringify(payload) : 'none');
          device.log('[TIME-SYNC] ════════════════════════════════════════');
          device._respondToTimeSyncRequest?.();
        }

        /**
         * Time response (0x24) - alternative name
         */
        timeResponse(payload) {
          device.log('[TIME-SYNC] timeResponse callback triggered');
        }

        /**
         * Data report - also check for time sync requests
         */
        dataReport(payload) {
          // Check if this is a time sync request disguised as dataReport
          if (payload?.commandIdentifier === 0x24) {
            device.log('[TIME-SYNC] ⏰ Time sync request via dataReport (cmd 0x24)');
            device._respondToTimeSyncRequest?.();
          }
        }
      }

      // Try to bind with different cluster names
      const clusterNames = ['tuya', 'manuSpecificTuya', 'tuyaSpecific', 61184, 0xEF00];
      let bound = false;

      for (const name of clusterNames) {
        try {
          endpoint.bind(name, new TimeSyncBoundCluster());
          this.log(`[TIME-SYNC] ✅ BoundCluster bound with name: ${name}`);
          bound = true;
          break;
        } catch (e) {
          // Try next name
        }
      }

      if (!bound) {
        this.log('[TIME-SYNC] ⚠️ Could not bind TimeSyncBoundCluster - RE-PAIR may be needed');
      }

      // v5.5.448: Also setup ZCL Time cluster handler (cluster 10 = 0x000A)
      // Device interview shows outputClusters: [25, 10] - device REQUESTS time via ZCL Time!
      await this._setupZclTimeClusterHandler();

    } catch (err) {
      this.log('[TIME-SYNC] BoundCluster setup error:', err.message);
    }
  }

  /**
   * v5.5.448: Setup ZCL Time cluster (0x000A) handler
   * Device interview shows: outputClusters: [25, 10]
   * Cluster 10 = ZCL Time cluster = device REQUESTS time from coordinator
   */
  async _setupZclTimeClusterHandler() {
    this.log('[TIME-SYNC] Setting up ZCL Time cluster (0x000A) handler...');

    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint) return;

      const device = this;

      // ZCL Time cluster BoundCluster
      class ZclTimeBoundCluster {
        /**
         * Read time attribute - device wants current time
         */
        time(payload) {
          device.log('[TIME-SYNC] ⏰ ZCL Time cluster read request!');
          device._respondToZclTimeRequest?.();
        }

        /**
         * Time status read
         */
        timeStatus(payload) {
          device.log('[TIME-SYNC] ZCL timeStatus request');
        }
      }

      // Try to bind ZCL Time cluster
      const timeClusterNames = ['time', 'genTime', 10, 0x000A];
      let bound = false;

      for (const name of timeClusterNames) {
        try {
          endpoint.bind(name, new ZclTimeBoundCluster());
          this.log(`[TIME-SYNC] ✅ ZCL Time BoundCluster bound: ${name}`);
          bound = true;
          break;
        } catch (e) { /* try next */ }
      }

      if (!bound) {
        this.log('[TIME-SYNC] ZCL Time cluster not available for binding');
      }

      // Also try to write time attribute directly to the binding
      await this._writeZclTimeAttribute();

    } catch (err) {
      this.log('[TIME-SYNC] ZCL Time setup error:', err.message);
    }
  }

  /**
   * v5.5.448: Write time to ZCL Time cluster attribute
   * ZCL Time uses seconds since 2000-01-01 (same as Tuya epoch!)
   */
  async _writeZclTimeAttribute() {
    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      const timeCluster = endpoint?.clusters?.time ||
        endpoint?.clusters?.genTime ||
        endpoint?.clusters?.[10];

      if (!timeCluster) {
        this.log('[TIME-SYNC] No ZCL Time cluster available');
        return;
      }

      // ZCL Time uses seconds since 2000-01-01 00:00:00 UTC
      const ZIGBEE_EPOCH = 946684800; // Same as Tuya epoch!
      const zigbeeTime = Math.floor(Date.now() / 1000) - ZIGBEE_EPOCH;

      this.log(`[TIME-SYNC] Writing ZCL Time: ${zigbeeTime} (since 2000-01-01)`);

      // Try to write time attribute (attribute ID 0)
      if (typeof timeCluster.writeAttributes === 'function') {
        await timeCluster.writeAttributes({ time: zigbeeTime });
        this.log('[TIME-SYNC] ✅ ZCL Time attribute written');
      }

    } catch (err) {
      this.log('[TIME-SYNC] ZCL Time write error:', err.message);
    }
  }

  /**
   * v5.5.448: Respond to ZCL Time cluster request
   */
  async _respondToZclTimeRequest() {
    this.log('[TIME-SYNC] 📤 Responding to ZCL Time request...');
    await this._writeZclTimeAttribute();
    // Also send Tuya format for good measure
    await this._respondToTimeSyncRequest();
  }

  /**
   * v5.5.447: Respond to time sync request from device
   * Called when device sends mcuSyncTime (0x24)
   */
  async _respondToTimeSyncRequest() {
    this.log('[TIME-SYNC] 📤 Responding to device time sync request...');

    try {
      // Calculate timestamps using Tuya epoch (2000-01-01)
      const TUYA_EPOCH_OFFSET = 946684800; // Seconds between 1970 and 2000
      const now = Math.floor(Date.now() / 1000);
      const utcTimeTuya = now - TUYA_EPOCH_OFFSET;
      const tzOffsetSeconds = new Date().getTimezoneOffset() * -60;
      const localTimeTuya = utcTimeTuya + tzOffsetSeconds;

      // v5.5.456: Enhanced diagnostic logging
      const readableUtc = new Date(now * 1000).toISOString();
      const readableLocal = new Date((now + tzOffsetSeconds) * 1000).toISOString();
      this.log(`[TIME-SYNC] 🕐 UTC: ${readableUtc}`);
      this.log(`[TIME-SYNC] 🕐 Local: ${readableLocal}`);
      this.log(`[TIME-SYNC] 🕐 Tuya UTC: ${utcTimeTuya} | Tuya Local: ${localTimeTuya}`);
      this.log(`[TIME-SYNC] 🕐 TZ offset: ${tzOffsetSeconds}s (${tzOffsetSeconds / 3600}h)`);

      // Build payload: [UTC:4][Local:4] per Z2M spec
      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcTimeTuya, 0);    // UTC first
      payload.writeUInt32BE(localTimeTuya, 4);  // Local second

      this.log(`[TIME-SYNC] 📦 Payload hex: ${payload.toString('hex')}`);

      // Find Tuya cluster
      const endpoint = this.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya ||
        endpoint?.clusters?.manuSpecificTuya ||
        endpoint?.clusters?.[61184];

      if (!tuyaCluster) {
        this.log('[TIME-SYNC] ⚠️ No Tuya cluster - trying TuyaEF00Manager');

        // Try via TuyaEF00Manager
        if (this.tuyaEF00Manager?.sendCommand) {
          await this.tuyaEF00Manager.sendCommand(0x24, payload);
          this.log('[TIME-SYNC] ✅ Sent via TuyaEF00Manager');
          return;
        }
        return;
      }

      // Try mcuSyncTime command (Z2M method)
      if (typeof tuyaCluster.command === 'function') {
        try {
          await tuyaCluster.command('mcuSyncTime', {
            payloadSize: 8,
            payload: [...payload]
          });
          this.log('[TIME-SYNC] ✅ Sent via mcuSyncTime command');
          return;
        } catch (e) {
          this.log('[TIME-SYNC] mcuSyncTime failed:', e.message);
        }
      }

      // Fallback: direct cluster method
      if (typeof tuyaCluster.mcuSyncTime === 'function') {
        await tuyaCluster.mcuSyncTime({ payloadSize: 8, payload: [...payload] });
        this.log('[TIME-SYNC] ✅ Sent via cluster.mcuSyncTime()');
      }

    } catch (err) {
      this.log('[TIME-SYNC] Response error:', err.message);
    }
  }

  /**
   * v5.5.194: CRITICAL - Setup LOW-LEVEL NODE handleFrame override
   *
   * This is the ONLY reliable way to receive 0xEF00 frames from TS0601 devices
   * that don't announce the cluster during Zigbee interview.
   *
   * The high-level zclNode API (BoundCluster, cluster.on()) only works for
   * clusters that the device announces. TS0601 devices do NOT announce 0xEF00.
   *
   * Reference: https://apps.developer.homey.app/wireless/zigbee#3-zigbee-api
   */
  async _setupLowLevelNodeHandler() {
    this.log('[TUYA-P0] ════════════════════════════════════════════════════');
    this.log('[TUYA-P0] Setting up LOW-LEVEL NODE handleFrame override...');
    this.log('[TUYA-P0] This is CRITICAL for TS0601 devices!');
    this.log('[TUYA-P0] ════════════════════════════════════════════════════');

    try {
      // ═══════════════════════════════════════════════════════════════════════
      // METHOD 1: Try this.node (direct reference from ZigBeeDevice)
      // ═══════════════════════════════════════════════════════════════════════
      let node = this.node;
      if (node) {
        this.log('[TUYA-P0] ✅ Found this.node directly');
      }

      // ═══════════════════════════════════════════════════════════════════════
      // METHOD 2: Try homey.zigbee.getNode() (Athom API)
      // ═══════════════════════════════════════════════════════════════════════
      if (!node && this.homey?.zigbee?.getNode) {
        node = await this.homey.zigbee.getNode(this);
        if (node) {
          this.log('[TUYA-P0] ✅ Got ZigBeeNode via homey.zigbee.getNode()');
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // METHOD 3: Try getNode() on device (older SDK)
      // ═══════════════════════════════════════════════════════════════════════
      if (!node && typeof this.getNode === 'function') {
        node = await this.getNode();
        if (node) {
          this.log('[TUYA-P0] ✅ Got ZigBeeNode via this.getNode()');
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // METHOD 4: Try zclNode.node reference
      // ═══════════════════════════════════════════════════════════════════════
      if (!node && this.zclNode?.node) {
        node = this.zclNode.node;
        this.log('[TUYA-P0] ✅ Found node via zclNode.node');
      }

      if (!node) {
        this.log('[TUYA-P0] ⚠️ Could not get ZigBeeNode - handleFrame override not possible');
        this.log('[TUYA-P0] ℹ️ Will rely on TuyaEF00Manager passive mode instead');
        return;
      }

      // Store reference for sending frames later
      this._zigbeeNode = node;

      // Log node info
      this.log(`[TUYA-P0] Node type: ${typeof node}`);
      this.log(`[TUYA-P0] Node has handleFrame: ${typeof node.handleFrame}`);

      // Override handleFrame to intercept ALL incoming frames
      const device = this;
      const originalHandleFrame = node.handleFrame?.bind(node);

      node.handleFrame = (endpointId, clusterId, frame, meta) => {
        // Check for Tuya cluster 0xEF00 (61184 decimal)
        if (clusterId === 0xEF00 || clusterId === 61184) {
          device.log('[TUYA-P0] ════════════════════════════════════════════════════');
          device.log('[TUYA-P0] 🎉 TUYA 0xEF00 FRAME RECEIVED!');
          device.log(`[TUYA-P0] Endpoint: ${endpointId}`);
          device.log(`[TUYA-P0] Frame length: ${frame?.length || 0}`);
          if (frame) {
            device.log(`[TUYA-P0] Frame hex: ${frame.toString('hex')}`);
          }
          device.log('[TUYA-P0] ════════════════════════════════════════════════════');

          // Track protocol stats
          if (device._protocolStats?.tuyaDP) {
            device._protocolStats.tuyaDP.received++;
            device._protocolStats.tuyaDP.lastTime = Date.now();
          }

          // Parse Tuya DP frame
          if (frame && frame.length > 2) {
            device._parseTuyaRawFrameFromNode(frame);
          }
        }

        // Call original handler if it exists (to not break other functionality)
        if (typeof originalHandleFrame === 'function') {
          try {
            return originalHandleFrame(endpointId, clusterId, frame, meta);
          } catch (e) {
            // Ignore errors from original handler (it may throw for unknown clusters)
          }
        }
      };

      this.log('[TUYA-P0] ✅ handleFrame override installed successfully!');
      this._lowLevelNodeHandlerInstalled = true;

    } catch (e) {
      this.log('[TUYA-P0] ⚠️ Low-level node handler setup failed:', e.message);
      this.log('[TUYA-P0] ℹ️ Will rely on TuyaEF00Manager passive mode instead');
    }
  }

  /**
   * v5.5.194: Parse raw Tuya frame from low-level node handler
   * Frame format: [header bytes][dp:1][type:1][len:2][value:N]...
   * v5.5.404: Handle time sync requests (cmd 0x24) for LCD climate sensors
   */
  _parseTuyaRawFrameFromNode(frame) {
    try {
      if (!frame || frame.length < 3) {
        this.log('[TUYA-P0] Frame too short to parse');
        return;
      }

      // v5.5.404: Check for Tuya time sync request (command 0x24)
      // Frame: [seqHi][seqLo][cmd=0x24][payload...]
      // The 0x24 can appear at position 2 (after 2-byte sequence) or position 0
      const frameHex = frame.toString('hex');
      if (frameHex.includes('24') && frame.length >= 3 && frame.length <= 10) {
        // Check if byte at position 2 is 0x24 (time sync request)
        const cmdByte = frame.length >= 3 ? frame[2] : null;
        if (cmdByte === 0x24) {
          this.log('[TUYA-P0] ⏰ TIME SYNC REQUEST detected (cmd 0x24)');
          this._handleTimeSyncRequest(frame);
          return;
        }
      }

      // For DP frames, need at least 6 bytes
      if (frame.length < 6) {
        this.log('[TUYA-P0] Frame too short for DP parsing (need 6+, got ' + frame.length + ')');
        return;
      }

      this.log(`[TUYA-P0] Parsing frame: ${frame.toString('hex')}`);

      // Tuya ZCL frame structure varies, try to find DP data
      // Common structure: [frameCtrl][seqNum][cmdId][status][transId][dp][type][lenHi][lenLo][value...]
      // Skip ZCL header (usually 3-5 bytes) and look for DP structure

      let offset = 0;

      // Skip potential ZCL header bytes until we find valid DP structure
      // DP type is 0x01 (bool), 0x02 (value), 0x03 (string), 0x04 (enum), 0x05 (bitmap)
      while (offset < frame.length - 4) {
        const possibleDp = frame[offset];
        const possibleType = frame[offset + 1];

        // Valid DP types are 0x00-0x05
        if (possibleType >= 0x00 && possibleType <= 0x05) {
          const lenHi = frame[offset + 2];
          const lenLo = frame[offset + 3];
          const len = (lenHi << 8) | lenLo;

          // Sanity check: length should be reasonable (< 256 for sensor values)
          if (len > 0 && len < 256 && offset + 4 + len <= frame.length) {
            const valueData = frame.slice(offset + 4, offset + 4 + len);

            // v5.5.500: Safety check - ensure valueData has expected length
            if (!valueData || valueData.length < len) {
              this.log(`[TUYA-P0] ⚠️ Buffer too short: expected ${len}, got ${valueData?.length || 0}`);
              offset++;
              continue;
            }

            let value;
            if (possibleType === 0x01 && len === 1) { // Bool
              value = valueData[0] !== 0;
            } else if (possibleType === 0x02 && len === 4 && valueData.length >= 4) { // Value (4-byte signed)
              value = valueData.readInt32BE(0);
            } else if (possibleType === 0x02 && len > 0) { // Value with non-standard length
              // v5.5.500: Handle 1-2 byte values that aren't 4 bytes
              value = 0;
              for (let i = 0; i < Math.min(len, valueData.length); i++) {
                value = (value << 8) | (valueData[i] & 0xFF);
              }
            } else if (possibleType === 0x04 && len >= 1) { // Enum
              value = valueData[0];
            } else if (possibleType === 0x00) { // Raw
              value = valueData;
            } else {
              value = valueData;
            }

            this.log(`[TUYA-P0] ✅ Parsed DP${possibleDp} type=${possibleType} len=${len} value=${value}`);
            this._handleDP(possibleDp, value);

            // Move to next potential DP
            offset += 4 + len;
            continue;
          }
        }

        // Not a valid DP structure at this offset, try next byte
        offset++;
      }
    } catch (err) {
      this.error('[TUYA-P0] Frame parse error:', err.message);
    }
  }

  /**
   * v5.5.404: Handle Tuya time sync request (command 0x24)
   * Device sends: [seqHi][seqLo][0x24][payload]
   * Response: [seqHi][seqLo][0x24][seqHi][seqLo][utc:4][local:4]
   *
   * Research sources:
   * - Z2M: https://github.com/Koenkk/zigbee2mqtt/issues/26078
   * - ZHA: https://github.com/zigpy/zha-device-handlers/blob/dev/zhaquirks/tuya/__init__.py
   * - Blakadder: https://zigbee.blakadder.com/Tuya_ZG227C.html
   */
  async _handleTimeSyncRequest(frame) {
    try {
      this.log('[TIME-SYNC] ⏰ Processing time sync request...');

      // Extract sequence number from request
      const seqNum = frame.length >= 2 ? (frame[0] << 8) | frame[1] : Date.now() % 65535;
      this.log(`[TIME-SYNC] Request sequence: 0x${seqNum.toString(16)}`);

      // Calculate timestamps
      // Tuya uses seconds since 2000-01-01 00:00:00 UTC (Tuya epoch)
      // Unix epoch is 1970-01-01, Tuya epoch is 2000-01-01
      const TUYA_EPOCH_OFFSET = 946684800; // Seconds between 1970 and 2000
      const now = Math.floor(Date.now() / 1000);
      const utcTimeTuya = now - TUYA_EPOCH_OFFSET;

      // Local time with timezone offset
      const tzOffsetSeconds = new Date().getTimezoneOffset() * -60; // getTimezoneOffset returns minutes, negative for UTC+
      const localTimeTuya = utcTimeTuya + tzOffsetSeconds;

      this.log(`[TIME-SYNC] UTC (Tuya epoch): ${utcTimeTuya} | Local: ${localTimeTuya} | TZ offset: ${tzOffsetSeconds}s`);

      // Find Tuya cluster to send response
      const endpoint = this.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya ||
        endpoint?.clusters?.manuSpecificTuya ||
        endpoint?.clusters?.[61184] ||
        endpoint?.clusters?.[0xEF00] ||
        endpoint?.clusters?.['61184'];

      // v5.5.439: Also try to get cluster via getClusterEndpoint
      let altCluster = null;
      if (!tuyaCluster) {
        try {
          altCluster = this.zclNode?.endpoints?.[1]?.getClusterCapability?.('tuya') ||
            this.getClusterCapability?.({ clusterId: 61184, endpoint: 1 });
        } catch (e) { /* ignore */ }
      }

      // v5.5.442: Try ZCL Time cluster (0x000A) as fallback for devices without Tuya cluster
      const timeCluster = endpoint?.clusters?.time ||
        endpoint?.clusters?.genTime ||
        endpoint?.clusters?.[10] ||
        endpoint?.clusters?.[0x000A];

      if (!tuyaCluster && !altCluster && !timeCluster) {
        this.log('[TIME-SYNC] ⚠️ No cluster available - device needs RE-PAIRING');
        this.log('[TIME-SYNC] 💡 Please remove and re-add the device to enable time sync');
        return;
      }

      // Build time sync response payload
      // Format: [utc:4 bytes BE][local:4 bytes BE]
      const payload = Buffer.alloc(8);
      payload.writeUInt32BE(utcTimeTuya, 0);
      payload.writeUInt32BE(localTimeTuya, 4);

      this.log(`[TIME-SYNC] 📤 Sending response: UTC=${utcTimeTuya}, Local=${localTimeTuya}`);
      this.log(`[TIME-SYNC] Payload hex: ${payload.toString('hex')}`);

      // Try multiple methods to send response
      let sent = false;

      // Method 1: Use timeResponse command if available
      if (typeof tuyaCluster.timeResponse === 'function') {
        try {
          await tuyaCluster.timeResponse({ time: payload });
          this.log('[TIME-SYNC] ✅ Sent via timeResponse()');
          sent = true;
        } catch (e) {
          this.log('[TIME-SYNC] timeResponse() failed:', e.message);
        }
      }

      // Method 2: Use command() with timeResponse
      if (!sent && typeof tuyaCluster.command === 'function') {
        try {
          await tuyaCluster.command('timeResponse', {
            transid: seqNum,
            payload: payload
          });
          this.log('[TIME-SYNC] ✅ Sent via command(timeResponse)');
          sent = true;
        } catch (e) {
          this.log('[TIME-SYNC] command(timeResponse) failed:', e.message);
        }
      }

      // Method 3: Use writeRaw if available
      if (!sent && typeof tuyaCluster.writeRaw === 'function') {
        try {
          // Full response frame: [seqHi][seqLo][0x24][payload]
          const responseFrame = Buffer.alloc(3 + payload.length);
          responseFrame.writeUInt16BE(seqNum, 0);
          responseFrame[2] = 0x24; // Time sync command
          payload.copy(responseFrame, 3);

          await tuyaCluster.writeRaw(responseFrame);
          this.log('[TIME-SYNC] ✅ Sent via writeRaw()');
          sent = true;
        } catch (e) {
          this.log('[TIME-SYNC] writeRaw() failed:', e.message);
        }
      }

      // v5.5.442: Method 4 - Use ZCL Time cluster if Tuya cluster failed
      if (!sent && timeCluster) {
        try {
          // ZCL Time cluster uses different format: seconds since 2000-01-01
          if (typeof timeCluster.writeAttributes === 'function') {
            await timeCluster.writeAttributes({
              time: utcTimeTuya,
              timeStatus: 0x02, // Master bit set
              localTime: localTimeTuya
            });
            this.log('[TIME-SYNC] ✅ Sent via ZCL Time cluster writeAttributes');
            sent = true;
          }
        } catch (e) {
          this.log('[TIME-SYNC] ZCL Time cluster failed:', e.message);
        }
      }

      if (!sent) {
        this.log('[TIME-SYNC] ⚠️ Could not send time sync response (no working method)');
        this.log('[TIME-SYNC] 💡 RE-PAIR the device to enable proper time sync');
      }

    } catch (err) {
      this.error('[TIME-SYNC] ❌ Error handling time sync:', err.message);
    }
  }

  /**
   * v5.5.25: Send Tuya dataQuery command to request all DPs
   * This wakes up sleepy devices and forces them to report all values
   *
   * Source: Zigbee2MQTT tuya.onEvent({queryOnDeviceAnnounce: true})
   * https://www.zigbee2mqtt.io/advanced/support-new-devices/02_support_new_tuya_devices.html
   */
  async _sendTuyaDataQuery() {
    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[TUYA-WAKE] No endpoint 1 available');
        return;
      }

      // Find Tuya cluster (0xEF00 = 61184)
      const tuyaCluster = endpoint.clusters?.tuya ||
        endpoint.clusters?.manuSpecificTuya ||
        endpoint.clusters?.[61184] ||
        endpoint.clusters?.[0xEF00];

      if (!tuyaCluster) {
        this.log('[TUYA-WAKE] Tuya cluster not found');
        return;
      }

      this.log('[TUYA-WAKE] 📤 Sending dataQuery to wake device...');

      // Method 1: Try command if available
      if (typeof tuyaCluster.command === 'function') {
        await tuyaCluster.command('dataQuery', {}).catch(() => { });
      }

      // Method 2: Try mcuVersionRequest (alternative wake command)
      if (typeof tuyaCluster.command === 'function') {
        await tuyaCluster.command('mcuVersionRequest', { seq: Date.now() % 65535 }).catch(() => { });
      }

      // Method 3: Direct frame if available (fallback)
      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.requestDPs === 'function') {
        const dpIds = Object.keys(this.dpMappings).map(Number);
        await this.tuyaEF00Manager.requestDPs(dpIds).catch(() => { });
      }

      this.log('[TUYA-WAKE] ✅ Wake commands sent (will be delivered on next wake)');
    } catch (err) {
      this.log('[TUYA-WAKE] ⚠️ Wake command failed:', err.message);
    }
  }

  /**
   * v5.5.25: Start periodic dataQuery for battery-powered devices
   * Tuya sensors sample every 5 min but may not report unless threshold exceeded
   * Sending dataQuery every 30 min ensures we get fresh data
   */
  _startPeriodicDataQuery() {
    // Clear existing interval if any
    if (this._dataQueryInterval) {
      clearInterval(this._dataQueryInterval);
    }

    // Query every 30 minutes (Tuya sync interval)
    const intervalMs = 30 * 60 * 1000;
    this._dataQueryInterval = setInterval(() => {
      this._sendTuyaDataQuery().catch(() => { });
    }, intervalMs);

    this.log('[TUYA-WAKE] ⏰ Periodic dataQuery started (every 30 min)');
  }

  /**
   * Fallback cluster listeners if TuyaEF00Manager fails
   */
  _setupTuyaClusterListenersFallback() {
    this.log('[TUYA-DP] Setting up fallback cluster listeners...');

    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint?.clusters) {
        this.log('[TUYA-DP] ⚠️ No clusters on endpoint 1');
        return;
      }

      // Find Tuya cluster (0xEF00 = 61184)
      const tuyaCluster = endpoint.clusters.tuya ||
        endpoint.clusters.manuSpecificTuya ||
        endpoint.clusters['61184'] ||
        endpoint.clusters[61184] ||
        endpoint.clusters[0xEF00];

      if (!tuyaCluster) {
        this.log('[TUYA-DP] ⚠️ Tuya cluster not found');
        this.log('[TUYA-DP] Available clusters:', Object.keys(endpoint.clusters).join(', '));
        return;
      }

      // Setup various event listeners
      const events = ['response', 'dataReport', 'reporting', 'report', 'datapoint', 'dp'];
      for (const evt of events) {
        if (typeof tuyaCluster.on === 'function') {
          tuyaCluster.on(evt, (data) => {
            this.log(`[TUYA-DP] 📥 Cluster event '${evt}' received`);
            this._parseRawTuyaData(data);
          });
        }
      }

      // Also listen on endpoint for raw frames
      if (typeof endpoint.on === 'function') {
        endpoint.on('frame', (frame) => {
          if (frame.cluster === 0xEF00 || frame.cluster === 61184) {
            this.log('[TUYA-DP] 📥 Raw frame received');
            this._parseTuyaFrame(frame.data);
          }
        });
      }

      this.log('[TUYA-DP] ✅ Fallback cluster listeners registered');
    } catch (err) {
      this.log('[TUYA-DP] ⚠️ Fallback setup error:', err.message);
    }
  }

  /**
   * Parse raw Tuya frame data
   */
  _parseTuyaFrame(data) {
    if (!data || data.length < 6) return;

    try {
      // Tuya frame format: [status:1][transid:1][dp:1][type:1][len:2][value:N]
      let offset = 2; // Skip status and transid
      while (offset < data.length - 4) {
        const dp = data[offset];
        const type = data[offset + 1];
        const len = (data[offset + 2] << 8) | data[offset + 3];

        // v5.5.500: Safety check - ensure we have enough data
        if (offset + 4 + len > data.length) {
          this.log(`[TUYA-DP] ⚠️ Frame truncated at DP${dp}`);
          break;
        }

        const valueData = data.slice(offset + 4, offset + 4 + len);

        // v5.5.500: Safety check - ensure valueData has expected length
        if (!valueData || valueData.length < len) {
          this.log(`[TUYA-DP] ⚠️ Buffer too short: expected ${len}, got ${valueData?.length || 0}`);
          offset++;
          continue;
        }

        let value;
        if (type === 0x01 && valueData.length >= 1) { // Bool
          value = valueData[0] !== 0;
        } else if (type === 0x02 && len === 4 && valueData.length >= 4) { // Value (4-byte)
          value = valueData.readInt32BE(0);
        } else if (type === 0x02 && len > 0) { // Value with non-standard length
          value = 0;
          for (let i = 0; i < Math.min(len, valueData.length); i++) {
            value = (value << 8) | (valueData[i] & 0xFF);
          }
        } else if (type === 0x04 && valueData.length >= 1) { // Enum
          value = valueData[0];
        } else {
          value = valueData;
        }

        this.log(`[TUYA-DP] Frame DP${dp} type=${type} len=${len} value=${value}`);
        this._handleDP(dp, value);

        offset += 4 + len;
      }
    } catch (err) {
      this.error('[TUYA-DP] Frame parse error:', err.message);
    }
  }

  _parseRawTuyaData(data) {
    try {
      if (!data) return;

      // Handle different data formats
      if (data.datapoints) {
        for (const dp of data.datapoints) {
          this._handleDP(dp.dp || dp.dpId, dp.value || dp.data);
        }
      } else if (data.dp !== undefined) {
        this._handleDP(data.dp, data.value || data.data);
      } else if (data.dpId !== undefined) {
        this._handleDP(data.dpId, data.dpValue || data.data);
      }
    } catch (err) {
      this.log('[TUYA-DP] Parse error:', err.message);
    }
  }

  _handleDP(dpId, rawValue) {
    // v5.5.200: CRITICAL - Initialize if not already done (race condition fix)
    if (!this._protocolStats) {
      this._protocolStats = {
        tuyaDP: { received: 0, lastTime: null },
        zcl: { received: 0, lastTime: null },
        iasZone: { received: 0, lastTime: null },
        raw: { received: 0, lastTime: null }
      };
    }

    // v5.5.344: DEDUPLICATION - Prevent processing same DP value multiple times
    // Multiple listeners (response, dataReport, dp, etc.) can fire for same event
    if (!this._dpDedup) this._dpDedup = {};
    const dp = parseInt(dpId);
    const now = Date.now();
    const dedupKey = `${dp}-${JSON.stringify(rawValue)}`;
    const lastProcess = this._dpDedup[dedupKey];

    if (lastProcess && (now - lastProcess) < 500) {
      // Same DP+value processed within 500ms - skip duplicate
      return;
    }
    this._dpDedup[dedupKey] = now;

    // Clean old dedup entries every 100 calls
    if (this._protocolStats.tuyaDP.received % 100 === 0) {
      const cutoff = now - 5000;
      for (const key in this._dpDedup) {
        if (this._dpDedup[key] < cutoff) delete this._dpDedup[key];
      }
    }

    // Track protocol stats
    if (this._protocolStats?.tuyaDP) {
      this._protocolStats.tuyaDP.received++;
      this._protocolStats.tuyaDP.lastTime = Date.now();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // v5.3.96: CRITICAL - Send time sync when device wakes up!
    // If we receive ANY data, the device is awake - send time immediately
    // ═══════════════════════════════════════════════════════════════════════
    this._sendTimeSyncIfNeeded();

    // v5.5.27: Track radio activity for sleepy device wake detection
    this.updateRadioActivity();

    // v5.5.347: REMOVED duplicate 'const dp' - already declared at line 1605

    // ═══════════════════════════════════════════════════════════════════════
    // v5.3.96: Handle special DPs that are common across ALL devices
    // ═══════════════════════════════════════════════════════════════════════
    this._handleCommonDP(dp, rawValue);

    // ═══════════════════════════════════════════════════════════════════════
    // v5.5.143: CONTEXT-AWARE DP MAPPING
    // Priority: 1) manufacturerName profile 2) local dpMappings 3) driverType 4) universal
    // ═══════════════════════════════════════════════════════════════════════
    const mfr = this._protocolInfo?.mfr || this.getSetting('zb_manufacturer_name') || '';
    const driverType = this.driver?.id || '';

    // v5.5.308: FIX - Local dpMappings MUST take priority over universal context mapping
    // Priority order: 1) local dpMappings 2) manufacturerName profile 3) driverType 4) universal
    let mapping = this.dpMappings[dp];

    // Only use context mapping if NO local mapping exists
    if (!mapping) {
      const contextMapping = getContextualDpMapping(dp, mfr, '', driverType);

      // Use context mapping if available AND we have the capability
      if (contextMapping && contextMapping.capability && this.hasCapability(contextMapping.capability)) {
        this.log(`[DP-CTX] 🎯 DP${dp} using ${contextMapping.source} profile (${contextMapping.deviceType || driverType})`);
        mapping = {
          capability: contextMapping.capability,
          transform: contextMapping.transform,
          setting: contextMapping.setting,
          divisor: 1  // transform already handles conversion
        };
      } else if (contextMapping && contextMapping.setting && !contextMapping.capability) {
        // Setting-only mapping (no capability update)
        const parsedValue = this._parseValue(rawValue);
        const settingValue = contextMapping.transform ? contextMapping.transform(parsedValue) : parsedValue;
        this.log(`[DP-CTX] ⚙️ DP${dp} → setting.${contextMapping.setting} = ${settingValue}`);
        this.setSettings({ [contextMapping.setting]: settingValue }).catch(() => { });
        return;
      }
    }

    if (!mapping) {
      // ═══════════════════════════════════════════════════════════════════════
      // v5.5.84: AUTO-DISCOVERY - Try universal DP patterns
      // Uses patterns from Z2M, ZHA, and community research
      // ═══════════════════════════════════════════════════════════════════════
      const parsedValue = this._parseValue(rawValue);
      const autoMapping = getUniversalDPMapping(dp, parsedValue, (cap) => this.hasCapability(cap));

      if (autoMapping) {
        const finalValue = autoMapping.transform ? autoMapping.transform(parsedValue) : parsedValue;
        this.log(`[DP-AUTO] 🔮 DP${dp} → ${autoMapping.capability} = ${finalValue} (pattern: ${autoMapping.pattern})`);
        this._safeSetCapability(autoMapping.capability, finalValue);
        return;
      }

      this.log(`[DP] ℹ️ Unmapped DP${dp} = ${rawValue} (mfr: ${mfr}, driver: ${driverType})`);
      return;
    }

    const { capability, divisor = 1, transform } = mapping;

    // Parse value
    let value = this._parseValue(rawValue);

    // Apply divisor
    if (divisor !== 1 && typeof value === 'number') {
      value = value / divisor;
    }

    // Apply custom transform if defined
    if (typeof transform === 'function') {
      value = transform(value);
    }

    // Round to reasonable precision
    if (typeof value === 'number') {
      value = Math.round(value * 10) / 10;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // v5.6.2: INTELLIGENT VALUE VALIDATION with auto-correction
    // Replaces manual sanity checks with ProductValueValidator
    // ═══════════════════════════════════════════════════════════════════════
    if (value === null || value === undefined) {
      this.log(`[DP] ⚠️ DP${dp} → ${capability} = null (skipped by transform)`);
      return;
    }

    // v5.5.305: CRITICAL FIX - Reject NaN values
    if (typeof value === 'number' && isNaN(value)) {
      this.log(`[DP] ⚠️ DP${dp} → ${capability} = NaN (invalid data) - IGNORED`);
      return;
    }

    // v5.6.2: Use intelligent validator for auto-correction
    if (this._valueValidator && capability) {
      const validation = this._valueValidator.validate(value, capability);

      if (!validation.isValid) {
        this.log(`[VALIDATOR] ❌ ${capability}: ${validation.message}`);
        return; // Reject invalid value
      }

      if (validation.correction) {
        this.log(`[VALIDATOR] 🔧 ${capability}: ${validation.message}`);
        value = validation.correctedValue;
      }
    }

    // v5.5.368: Battery-specific throttling (keep for spam prevention)
    if (capability === 'measure_battery' && typeof value === 'number') {
      const now = Date.now();
      const lastBatteryUpdate = this._lastBatteryUpdate || 0;
      const lastBatteryValue = this._lastBatteryValue ?? null;
      const timeSinceLastUpdate = now - lastBatteryUpdate;
      const batteryChange = lastBatteryValue !== null ? Math.abs(value - lastBatteryValue) : 100;

      const THROTTLE_MS = 300000;  // 5 minutes
      const SIGNIFICANT_CHANGE = 5;  // 5% change threshold

      if (batteryChange < SIGNIFICANT_CHANGE && timeSinceLastUpdate < THROTTLE_MS && lastBatteryUpdate !== 0) {
        return; // Suppress spam
      }

      // Reject large jumps (>30%) within 60 seconds - likely sensor glitch
      if (lastBatteryValue !== null && timeSinceLastUpdate < 60000 && batteryChange > 30) {
        this.log(`[DP] ⚠️ Battery glitch: ${lastBatteryValue}% → ${value}% - IGNORED`);
        return;
      }

      this._lastBatteryUpdate = now;
      this._lastBatteryValue = value;
    }

    this.log(`[DP] DP${dp} → ${capability} = ${value}`);

    // v5.5.200: CRITICAL FIX - Initialize _sensorValues if undefined
    // This can happen if _handleDP is called before onNodeInit completes
    // (e.g., via low-level handleFrame override)
    if (!this._sensorValues) {
      this._sensorValues = {};
    }

    // Store value
    this._sensorValues[capability] = value;
    this._lastUpdate = Date.now();

    // Set capability
    this._safeSetCapability(capability, value);

    // v5.5.170: Support alsoSets for mapping one DP to multiple capabilities (e.g. alarm_motion + alarm_human)
    if (mapping.alsoSets && typeof mapping.alsoSets === 'object') {
      const parsedRaw = this._parseValue(rawValue);
      for (const [alsoCap, alsoTransform] of Object.entries(mapping.alsoSets)) {
        if (this.hasCapability(alsoCap)) {
          const alsoValue = typeof alsoTransform === 'function' ? alsoTransform(parsedRaw) : parsedRaw;
          this.log(`[DP] DP${dp} → ${alsoCap} = ${alsoValue} (alsoSets)`);
          this._safeSetCapability(alsoCap, alsoValue);
        }
      }
    }
  }

  /**
   * v5.5.305: Enhanced value parser with better Buffer handling
   * Fixes DP12 NaN issue where Buffer {type:"Buffer",data:[0,0,13,70]} was parsed as 'F'
   */
  _parseValue(raw) {
    // Already a number
    if (typeof raw === 'number') return raw;

    // Boolean
    if (typeof raw === 'boolean') return raw ? 1 : 0;

    // v5.5.305: Handle JSON-serialized Buffer object: {type: "Buffer", data: [...]}
    if (raw && typeof raw === 'object' && raw.type === 'Buffer' && Array.isArray(raw.data)) {
      const bytes = raw.data;
      if (bytes.length === 0) return 0;
      if (bytes.length === 1) return bytes[0];
      // Parse as big-endian unsigned integer
      let value = 0;
      for (let i = 0; i < bytes.length; i++) {
        value = (value << 8) | (bytes[i] & 0xFF);
      }
      return value;
    }

    // Buffer/Array
    if (Buffer.isBuffer(raw) || Array.isArray(raw)) {
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      if (buf.length === 0) return 0;
      if (buf.length === 1) return buf[0];
      if (buf.length === 2) return buf.readUInt16BE(0);
      if (buf.length === 4) return buf.readUInt32BE(0);
      // For larger buffers, parse as big-endian
      let value = 0;
      for (let i = 0; i < Math.min(buf.length, 4); i++) {
        value = (value << 8) | buf[i];
      }
      return value;
    }

    // String number
    if (typeof raw === 'string') {
      const num = parseFloat(raw);
      return isNaN(num) ? raw : num;
    }

    return raw;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.3.96: TIME SYNC ON DEVICE WAKE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Send time sync when device wakes up (received data = device is awake)
   * Only send once per 5 minutes to avoid spam
   */
  _sendTimeSyncIfNeeded() {
    const now = Date.now();
    const lastSync = this._lastTimeSync || 0;
    const minInterval = 5 * 60 * 1000; // 5 minutes

    if (now - lastSync < minInterval) return;

    this._lastTimeSync = now;
    this.log('[TIME-SYNC] ⏰ Device is awake - sending time sync...');

    // v5.5.187: CRITICAL - Auto-detect if device needs Tuya epoch (2000) for LCD display
    // _TZE284_*, _TZE204_*, _TZE200_* with LCD displays need Tuya epoch!
    const mfr = this.getSetting?.('zb_manufacturer_name') || '';
    const needsTuyaEpoch = mfr.startsWith('_TZE284') || mfr.startsWith('_TZE204') ||
      this.useTuyaEpoch === true || this.driver?.id?.includes('lcd') ||
      this.driver?.id?.includes('climate');

    // Use improved syncDeviceTimeTuya with epoch auto-detection
    syncDeviceTimeTuya(this, {
      logPrefix: '[TIME-SYNC]',
      useTuyaEpoch: needsTuyaEpoch
    }).catch(e => this.log('[TIME-SYNC] Tuya sync failed:', e.message));

    // Also try via TuyaEF00Manager as fallback
    if (this.tuyaEF00Manager?.sendTimeSync) {
      this.tuyaEF00Manager.sendTimeSync(this.zclNode).catch(e =>
        this.log('[TIME-SYNC] Manager sync failed:', e.message)
      );
    }

    // Also try direct method
    this._sendDirectTimeSync().catch(() => { });
  }

  /**
   * v5.3.98: Send time sync directly to Tuya cluster with TIMEZONE support
   * Based on Z2M Discussion #26036 - device needs local time with proper format
   */
  async _sendDirectTimeSync() {
    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya ||
        endpoint?.clusters?.manuSpecificTuya ||
        endpoint?.clusters?.['61184'] ||
        endpoint?.clusters?.[61184];

      if (!tuyaCluster) return;

      const now = new Date();

      // Get timezone offset in hours (e.g., +1 for Paris, +2 for Paris DST)
      const timezoneOffsetMinutes = -now.getTimezoneOffset(); // JS gives negative for positive UTC
      const timezoneOffsetHours = Math.floor(timezoneOffsetMinutes / 60);

      this.log('[TIME-SYNC] 🕐 Local time:', now.toLocaleString());
      this.log('[TIME-SYNC] 🌍 Timezone offset:', `UTC${timezoneOffsetHours >= 0 ? '+' : ''}${timezoneOffsetHours}`);

      // Method 1: Standard Tuya local time format (DP 0x24)
      const localPayload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),      // LOCAL hours
        now.getMinutes(),
        now.getSeconds(),
        Math.floor((now.getDay() + 6) % 7) // Monday = 0
      ]);

      // Method 2: UTC + Timezone format (DP 0x1C) - for devices that need this
      const utcTimestamp = Math.floor(now.getTime() / 1000);
      const utcPayload = Buffer.alloc(8);
      utcPayload.writeUInt32BE(utcTimestamp, 0);
      utcPayload.writeInt16BE(timezoneOffsetMinutes, 4); // Timezone in minutes
      utcPayload.writeUInt16BE(0, 6); // Reserved

      // Try Method 1 first (local time - most common for TH05Z)
      if (typeof tuyaCluster.setData === 'function') {
        try {
          await tuyaCluster.setData({
            status: 0,
            transid: Math.floor(Math.random() * 255),
            dp: 0x24,
            datatype: 0x00,
            length_hi: 0,
            length_lo: localPayload.length,
            data: localPayload
          });
          this.log('[TIME-SYNC] ✅ Local time sent (DP 0x24)');
        } catch (e) {
          this.log('[TIME-SYNC] DP 0x24 failed:', e.message);
        }

        // Also try UTC+timezone format
        try {
          await tuyaCluster.setData({
            status: 0,
            transid: Math.floor(Math.random() * 255),
            dp: 0x1C, // UTC time sync DP
            datatype: 0x00,
            length_hi: 0,
            length_lo: utcPayload.length,
            data: utcPayload
          });
          this.log('[TIME-SYNC] ✅ UTC+TZ sent (DP 0x1C)');
        } catch (e) {
          // Some devices don't support this - that's OK
        }
      }
    } catch (err) {
      this.log('[TIME-SYNC] ⚠️ Error:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.3.96: COMMON DP HANDLING (buttons, LED, presence, etc.)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Handle DPs that are common across many device types
   * v5.5.226: Fixed to not trigger button detection for DPs already mapped to capabilities
   */
  _handleCommonDP(dp, rawValue) {
    const value = this._parseValue(rawValue);

    // ─────────────────────────────────────────────────────────────────────────
    // BUTTON PRESS DETECTION (various DPs used by different devices)
    // v5.5.226: Only trigger if device has button capability AND DP is not mapped
    // ─────────────────────────────────────────────────────────────────────────
    const buttonDPs = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 120, 121];
    const hasButtonCapability = this.hasCapability('button') ||
      this.hasCapability('button.1') ||
      this.hasCapability('button.2');

    // v5.5.226: Check if this DP is already mapped to a capability in dpMappings
    const dpIsMapped = this.dpMappings && this.dpMappings[dp] && this.dpMappings[dp].capability;

    // Only process as button if: has button capability, DP not mapped, value is button-like
    if (hasButtonCapability && !dpIsMapped && buttonDPs.includes(dp) && (value === 0 || value === 1 || value === 2)) {
      this.log(`[BUTTON] 🔘 Button press detected! DP${dp} = ${value}`);

      // Trigger button capability if available
      if (this.hasCapability('button')) {
        this.setCapabilityValue('button', true).catch(() => { });
        setTimeout(() => this.setCapabilityValue('button', false).catch(() => { }), 500);
      }

      // Emit event for flows
      this.homey.flow.getDeviceTriggerCard('button_pressed')?.trigger(this, {
        button: dp.toString(),
        action: value === 0 ? 'single' : value === 1 ? 'double' : 'hold'
      }).catch(() => { });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LED STATE (commonly DP 101 or DP 13)
    // ─────────────────────────────────────────────────────────────────────────
    if ((dp === 13 || dp === 101) && this.hasCapability('onoff.led')) {
      const ledOn = Boolean(value);
      this.log(`[LED] 💡 LED state: ${ledOn ? 'ON' : 'OFF'}`);
      this.setCapabilityValue('onoff.led', ledOn).catch(() => { });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PRESENCE/MOTION (DP 1 is most common for presence sensors)
    // ─────────────────────────────────────────────────────────────────────────
    if (dp === 1 && this.hasCapability('alarm_motion')) {
      const motion = Boolean(value);
      this.log(`[PRESENCE] 🚶 Motion/Presence: ${motion ? 'DETECTED' : 'clear'}`);
      this.setCapabilityValue('alarm_motion', motion).catch(() => { });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BATTERY (multiple common DPs)
    // ─────────────────────────────────────────────────────────────────────────
    if ([4, 14, 15, 100, 101].includes(dp) && this.hasCapability('measure_battery')) {
      if (typeof value === 'number' && value >= 0 && value <= 100) {
        this._handleBatteryDP(dp, value);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ILLUMINANCE (DP 12, 103, or 106 common for radar sensors)
    // v5.5.226: Added DP106 for ZG-204ZM radar sensors
    // v5.5.306: RONNY FIX #760 - Clamp lux to 2000 max for TZE devices
    // ─────────────────────────────────────────────────────────────────────────────
    if ([12, 103, 106].includes(dp) && this.hasCapability('measure_luminance')) {
      if (typeof value === 'number' && value >= 0) {
        // v5.5.306: RONNY FIX #760 - Clamp lux for TZE devices (spec: 0-2000 lux)
        const mfr = this.getSetting?.('zb_manufacturer_name') || '';
        let luxValue = value;
        let maxLux = 100000; // Default max

        // TZE284/TZE204 radar sensors have 0-2000 lux range
        if (mfr.startsWith('_TZE284') || mfr.startsWith('_TZE204') || mfr.startsWith('_TZE200')) {
          maxLux = 2000;
          // Auto-detect raw ADC values (if > 5x max, likely needs conversion)
          if (luxValue > maxLux * 5) {
            luxValue = Math.round(luxValue / 100);
            this.log(`[LUX] 📊 Raw ADC converted: ${value} -> ${luxValue} lux`);
          }
          // Clamp to spec range
          if (luxValue > maxLux) {
            this.log(`[LUX] ⚠️ Clamping ${luxValue} -> ${maxLux} lux (TZE device spec limit)`);
            luxValue = maxLux;
          }
        }

        this.log(`[LUX] ☀️ Illuminance: ${luxValue} lux`);
        this.setCapabilityValue('measure_luminance', parseFloat(luxValue)).catch(() => { });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TARGET DISTANCE (DP 9 for radar sensors)
    // ─────────────────────────────────────────────────────────────────────────
    if (dp === 9 && this.hasCapability('measure_distance')) {
      const distance = typeof value === 'number' ? value / 100 : value; // cm to m
      this.log(`[RADAR] 📏 Target distance: ${distance}m`);
      this.setCapabilityValue('measure_distance', parseFloat(distance)).catch(() => { });
    }
  }

  /**
   * Handle ZCL data from UniversalDataHandler
   * v5.3.94: FIX - UDH already converts values, don't divide again!
   */
  _handleZCLData(cluster, attr, value) {
    // Track protocol stats
    if (this._protocolStats?.zcl) {
      this._protocolStats.zcl.received++;
      this._protocolStats.zcl.lastTime = Date.now();
    }

    this.log(`[ZCL-DATA] ${cluster}.${attr} = ${value}`);

    // v5.3.94: UDH already converts values (temp/100, humidity/100, etc.)
    // So we just need to map to capabilities WITHOUT additional division
    const zclMappings = {
      'temperatureMeasurement.measuredValue': 'measure_temperature',
      'msTemperatureMeasurement.measuredValue': 'measure_temperature',
      'relativeHumidity.measuredValue': 'measure_humidity',
      'msRelativeHumidity.measuredValue': 'measure_humidity',
      'illuminanceMeasurement.measuredValue': 'measure_luminance',
      'msIlluminanceMeasurement.measuredValue': 'measure_luminance',
      'powerConfiguration.batteryPercentageRemaining': 'measure_battery',
      'genPowerCfg.batteryPercentageRemaining': 'measure_battery',
      'occupancySensing.occupancy': 'alarm_motion',
      'msOccupancySensing.occupancy': 'alarm_motion',
      // v5.5.64: iasZone.zoneStatus - auto-detect capability (motion > contact)
      'iasZone.zoneStatus': 'auto_ias'
    };

    const key = `${cluster}.${attr}`;
    let capability = zclMappings[key];

    // v5.5.64: Smart IAS Zone mapping - prioritize alarm_motion over alarm_contact for radars
    if (capability === 'auto_ias') {
      if (this.hasCapability('alarm_motion')) {
        capability = 'alarm_motion';
      } else if (this.hasCapability('alarm_contact')) {
        capability = 'alarm_contact';
      } else if (this.hasCapability('alarm_water')) {
        capability = 'alarm_water';
      } else if (this.hasCapability('alarm_smoke')) {
        capability = 'alarm_smoke';
      } else {
        // Default to alarm_motion for sensors
        capability = 'alarm_motion';
      }
      this.log(`[ZCL-DATA] IAS Zone auto-mapped to: ${capability}`);
    }

    if (capability) {
      // Convert boolean-like values
      let finalValue = value;
      if (capability.startsWith('alarm_')) {
        finalValue = typeof value === 'boolean' ? value : value > 0;
      }
      // Round numeric values
      if (typeof finalValue === 'number') {
        finalValue = Math.round(finalValue * 10) / 10;
      }

      this.log(`[ZCL-DATA] → ${capability} = ${finalValue}`);
      this._safeSetCapability(capability, finalValue);
    }
  }

  async _requestInitialDPs() {
    if (!this.tuyaEF00Manager) return;

    try {
      const dps = Object.keys(this.dpMappings).map(Number);
      this.log(`[TUYA-DP] Requesting initial DPs: ${dps.join(', ')}`);

      if (typeof this.tuyaEF00Manager.requestDPs === 'function') {
        await this.tuyaEF00Manager.requestDPs(dps);
      }
    } catch (err) {
      this.log('[TUYA-DP] ⚠️ Could not request DPs (device may be sleeping)');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZCL MODE (Standard clusters)
  // ═══════════════════════════════════════════════════════════════════════════

  async _setupZCLMode(zclNode) {
    this.log('[ZCL] ════════════════════════════════════════════════════════');
    this.log('[ZCL] Setting up standard ZCL mode...');
    this.log('[ZCL] ════════════════════════════════════════════════════════');

    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint) {
      this.log('[ZCL] ⚠️ No endpoint 1 found');
      return;
    }

    const clusters = endpoint.clusters || {};

    // Temperature (0x0402)
    await this._setupZCLCluster(clusters,
      ['temperatureMeasurement', 'msTemperatureMeasurement'],
      'measure_temperature',
      (value) => Math.round((value / 100) * 10) / 10
    );

    // Humidity (0x0405)
    await this._setupZCLCluster(clusters,
      ['relativeHumidity', 'msRelativeHumidity'],
      'measure_humidity',
      (value) => Math.round(value / 100)
    );

    // Battery (0x0001)
    await this._setupZCLCluster(clusters,
      ['powerConfiguration', 'genPowerCfg'],
      'measure_battery',
      (value) => Math.min(100, Math.round(value / 2)),
      'batteryPercentageRemaining'
    );

    // Illuminance (0x0400)
    await this._setupZCLCluster(clusters,
      ['illuminanceMeasurement', 'msIlluminanceMeasurement'],
      'measure_luminance',
      (value) => Math.round(Math.pow(10, (value - 1) / 10000))
    );

    // Occupancy / Motion (0x0406)
    await this._setupZCLCluster(clusters,
      ['occupancySensing', 'msOccupancySensing'],
      'alarm_motion',
      (value) => value > 0,
      'occupancy'
    );

    // IAS Zone (0x0500) - Contact, Motion, Water, Smoke
    await this._setupIASZone(clusters);

    // ─────────────────────────────────────────────────────────────────────────
    // v5.5.84: UNIVERSAL ZCL LISTENERS - Auto-discover ALL other clusters
    // Uses UniversalTuyaParser for maximum coverage
    // ─────────────────────────────────────────────────────────────────────────
    this.log('[ZCL-UNIVERSAL] Setting up universal listeners for all endpoints...');
    try {
      setupUniversalZCLListeners(this, zclNode, this.clusterHandlers || {});
    } catch (e) {
      this.log('[ZCL-UNIVERSAL] ⚠️ Universal setup warning:', e.message);
    }

    this.log('[ZCL] ✅ ZCL setup complete (with universal coverage)');
  }

  async _setupZCLCluster(clusters, clusterNames, capability, transform, attribute = 'measuredValue') {
    if (!this.hasCapability(capability)) return;

    let cluster = null;
    for (const name of clusterNames) {
      if (clusters[name]) {
        cluster = clusters[name];
        break;
      }
    }

    if (!cluster) return;

    try {
      // Setup attribute listener
      const attrEvent = `attr.${attribute}`;
      cluster.on(attrEvent, (value) => {
        // Track protocol stats
        if (this._protocolStats?.zcl) {
          this._protocolStats.zcl.received++;
          this._protocolStats.zcl.lastTime = Date.now();
        }
        const transformed = transform(value);
        this.log(`[ZCL] 📥 ${capability} = ${transformed}`);
        this._safeSetCapability(capability, transformed);
      });

      // Try to read initial value (with timeout)
      const readPromise = cluster.readAttributes([attribute])
        .then(data => {
          if (data?.[attribute] != null) {
            const transformed = transform(data[attribute]);
            this.log(`[ZCL] Initial ${capability} = ${transformed}`);
            this._safeSetCapability(capability, transformed);
          }
        })
        .catch(() => { });

      await Promise.race([readPromise, new Promise(r => setTimeout(r, 3000))]);

      // ═══════════════════════════════════════════════════════════════════════
      // v5.4.00: ENHANCED REPORTING CONFIGURATION (from OpenHAB/Z2M research)
      // minInterval: Don't report more often than this (seconds)
      // maxInterval: Force report even if no change (seconds)
      // minChange: Minimum change to trigger report (after minInterval)
      // ═══════════════════════════════════════════════════════════════════════
      if (typeof cluster.configureReporting === 'function') {
        // Reporting intervals based on capability type
        const reportingConfig = this._getReportingConfig(capability, attribute);

        cluster.configureReporting({
          [attribute]: reportingConfig
        }).then(() => {
          this.log(`[ZCL] ✅ Reporting configured: ${capability} (${reportingConfig.minInterval}s-${reportingConfig.maxInterval}s)`);
        }).catch((err) => {
          this.log(`[ZCL] ⚠️ Reporting config failed for ${capability}: ${err.message}`);
        });
      }

      this.log(`[ZCL] ✅ ${capability} configured`);
    } catch (err) {
      this.log(`[ZCL] ⚠️ ${capability} setup failed:`, err.message);
    }
  }

  /**
   * v5.4.00: Get optimal reporting configuration per capability
   * Based on OpenHAB, Z2M, and Hubitat research
   *
   * @param {string} capability - Homey capability name
   * @param {string} attribute - ZCL attribute name
   * @returns {Object} Reporting config {minInterval, maxInterval, minChange}
   */
  _getReportingConfig(capability, attribute) {
    // Battery-powered device detection
    const isBatteryPowered = !this.mainsPowered;

    // Optimal intervals based on capability type
    const configs = {
      // Temperature: Report on 0.5°C change, every 5-60 min (battery) or 1-30 min (mains)
      'measure_temperature': {
        minInterval: isBatteryPowered ? 300 : 60,    // 5 min / 1 min
        maxInterval: isBatteryPowered ? 3600 : 1800, // 1 hour / 30 min
        minChange: 50  // 0.5°C (value in centidegrees)
      },

      // Humidity: Report on 2% change, every 5-60 min (battery) or 1-30 min (mains)
      'measure_humidity': {
        minInterval: isBatteryPowered ? 300 : 60,
        maxInterval: isBatteryPowered ? 3600 : 1800,
        minChange: 200  // 2% (value in 0.01%)
      },

      // Battery: Report on 1% change, every 10 min - 6 hours
      'measure_battery': {
        minInterval: 600,   // 10 min minimum
        maxInterval: 21600, // 6 hours
        minChange: 2        // 1% (ZCL reports half value, so 2 = 1%)
      },

      // Illuminance: Report on significant change, every 1-30 min
      'measure_luminance': {
        minInterval: 60,
        maxInterval: 1800,
        minChange: 1000  // ~25% change in lux
      },

      // Motion/Occupancy: Report immediately (0), max 5 min
      'alarm_motion': {
        minInterval: 0,     // Report immediately
        maxInterval: 300,   // Force update every 5 min
        minChange: 1
      },

      // Contact: Report immediately
      'alarm_contact': {
        minInterval: 0,
        maxInterval: 3600,
        minChange: 1
      }
    };

    // Return config for capability, or default
    return configs[capability] || {
      minInterval: isBatteryPowered ? 300 : 60,
      maxInterval: isBatteryPowered ? 3600 : 1800,
      minChange: 1
    };
  }

  async _setupIASZone(clusters) {
    const iasCluster = clusters.iasZone || clusters.ssIasZone;
    if (!iasCluster) return;

    try {
      // v5.5.65: Smart capability detection - use EXISTING capability first!
      // Priority: alarm_motion > alarm_contact > alarm_water > alarm_smoke
      let capability = null;

      // Check what capabilities the device ALREADY has
      if (this.hasCapability('alarm_motion')) {
        capability = 'alarm_motion';
      } else if (this.hasCapability('alarm_contact')) {
        capability = 'alarm_contact';
      } else if (this.hasCapability('alarm_water')) {
        capability = 'alarm_water';
      } else if (this.hasCapability('alarm_smoke')) {
        capability = 'alarm_smoke';
      }

      // Only read zoneType if we don't have an existing capability
      if (!capability) {
        try {
          const attrs = await iasCluster.readAttributes(['zoneType']);
          const zoneType = attrs?.zoneType;

          if (zoneType === 0x000D) capability = 'alarm_motion';      // Motion
          else if (zoneType === 0x0015) capability = 'alarm_contact'; // Contact
          else if (zoneType === 0x002A) capability = 'alarm_water';   // Water
          else if (zoneType === 0x0028) capability = 'alarm_smoke';   // Smoke
          else capability = 'alarm_motion'; // Default to motion for sensors
        } catch (e) {
          capability = 'alarm_motion'; // Default to motion on error
        }

        // Only add capability if device doesn't have ANY alarm capability
        if (!this.hasCapability(capability)) {
          await this.addCapability(capability).catch(() => { });
        }
      }

      this.log(`[IAS] Using existing capability: ${capability}`);

      iasCluster.on('attr.zoneStatus', (status) => {
        const alarm = (status & 1) !== 0; // Bit 0 = Alarm1
        this.log(`[IAS] ${capability} = ${alarm}`);
        this._safeSetCapability(capability, alarm);
      });

      this.log(`[IAS] ✅ ${capability} configured`);
    } catch (err) {
      this.log('[IAS] Setup error:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // IAS ZONE STATUS PARSER - Handles ALL formats
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * v5.5.17: Universal IAS Zone status parser
   * Handles ALL possible formats: Buffer, serialized Buffer, number, object, bitfield
   *
   * @param {any} zoneStatus - Raw zone status in any format
   * @returns {{alarm1: boolean, alarm2: boolean, tamper: boolean, battery: boolean, raw: number}}
   */
  _parseIASZoneStatus(zoneStatus) {
    let rawValue = 0;

    if (zoneStatus === null || zoneStatus === undefined) {
      return { alarm1: false, alarm2: false, tamper: false, battery: false, raw: 0 };
    }

    // Format 1: Direct number (most common for attr.zoneStatus)
    if (typeof zoneStatus === 'number') {
      rawValue = zoneStatus;
    }
    // Format 2: Boolean (some devices send true/false directly)
    else if (typeof zoneStatus === 'boolean') {
      rawValue = zoneStatus ? 1 : 0;
    }
    // Format 3: Node.js Buffer
    else if (Buffer.isBuffer(zoneStatus)) {
      rawValue = zoneStatus.length >= 2
        ? (zoneStatus[1] << 8) | zoneStatus[0]  // Little-endian
        : zoneStatus[0] || 0;
    }
    // Format 4: Serialized Buffer {type: "Buffer", data: [1, 0]}
    else if (zoneStatus.type === 'Buffer' && Array.isArray(zoneStatus.data)) {
      const data = zoneStatus.data;
      rawValue = data.length >= 2
        ? (data[1] << 8) | data[0]  // Little-endian
        : data[0] || 0;
    }
    // Format 5: Array directly [1, 0]
    else if (Array.isArray(zoneStatus)) {
      rawValue = zoneStatus.length >= 2
        ? (zoneStatus[1] << 8) | zoneStatus[0]
        : zoneStatus[0] || 0;
    }
    // Format 6: Object with properties {alarm1: true, alarm2: false, ...}
    else if (typeof zoneStatus === 'object') {
      // Try to read individual bits from object
      if ('alarm1' in zoneStatus || 'alarm2' in zoneStatus) {
        return {
          alarm1: !!zoneStatus.alarm1,
          alarm2: !!zoneStatus.alarm2,
          tamper: !!zoneStatus.tamper,
          battery: !!zoneStatus.batteryLow || !!zoneStatus.battery,
          raw: (zoneStatus.alarm1 ? 1 : 0) | (zoneStatus.alarm2 ? 2 : 0)
        };
      }
      // Try to extract value from object
      if ('value' in zoneStatus) {
        rawValue = typeof zoneStatus.value === 'number' ? zoneStatus.value : 0;
      } else if ('data' in zoneStatus) {
        rawValue = typeof zoneStatus.data === 'number' ? zoneStatus.data : 0;
      }
    }
    // Format 7: String (some devices send "1" or "true")
    else if (typeof zoneStatus === 'string') {
      if (zoneStatus === 'true' || zoneStatus === '1') {
        rawValue = 1;
      } else {
        rawValue = parseInt(zoneStatus, 10) || 0;
      }
    }

    // Parse bits from raw value (ZCL IAS Zone Status bitmap)
    // Bit 0: Alarm1 (zone-specific alarm)
    // Bit 1: Alarm2 (zone-specific alarm)
    // Bit 2: Tamper
    // Bit 3: Battery low
    return {
      alarm1: (rawValue & 0x01) !== 0,
      alarm2: (rawValue & 0x02) !== 0,
      tamper: (rawValue & 0x04) !== 0,
      battery: (rawValue & 0x08) !== 0,
      raw: rawValue
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFE CAPABILITY SETTER WITH DYNAMIC CAPABILITY ADDITION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * v5.5.118: List of capabilities that can be dynamically added when detected
   * These are standard Homey capabilities that are safe to add at runtime
   */
  static get DYNAMIC_CAPABILITIES() {
    return [
      'measure_temperature', 'measure_humidity', 'measure_battery',
      'measure_luminance', 'measure_pressure', 'measure_co2',
      'measure_pm25', 'measure_voc', 'measure_distance',
      'alarm_motion', 'alarm_contact', 'alarm_water', 'alarm_smoke',
      'alarm_gas', 'alarm_co', 'alarm_tamper', 'alarm_battery', 'alarm_vibration',
      'measure_power', 'measure_voltage', 'measure_current', 'meter_power'
    ];
  }

  /**
   * v5.5.118: Safe capability setter with dynamic capability addition
   * - If capability is missing but known, try to add it dynamically
   * - Apply calibration offsets
   * - Log value changes clearly
   * v5.5.497: FORUM #933 FIX - Added sanity checks for bizarre values
   */
  async _safeSetCapability(capability, value) {
    // v5.5.497: FORUM #933 FIX - Block bizarre values
    // Rudy_De_Vylder: Strange temp/humidity on presence sensors, battery 0%/100% jumps
    const blocked = this._blockBizarreValue(capability, value);
    if (blocked) return;

    // v5.5.118: Dynamic capability addition - if missing but known, add it!
    if (!this.hasCapability(capability)) {
      if (HybridSensorBase.DYNAMIC_CAPABILITIES.includes(capability)) {
        try {
          await this.addCapability(capability);
          this.log(`[CAP] ✨ DYNAMIC ADD: ${capability} (detected from DP/ZCL data)`);
        } catch (e) {
          this.log(`[CAP] ⚠️ Could not add ${capability}: ${e.message}`);
          return;
        }
      } else {
        this.log(`[CAP] ⚠️ Missing capability: ${capability} (not in dynamic list)`);
        return;
      }
    }

    // v5.5.28: Apply calibration offsets from settings
    const calibratedValue = this._applyCalibration(capability, value);

    // v5.5.292: Get previous value BEFORE setting new value (for flow triggers)
    const previousValue = this.getCapabilityValue(capability);

    this.setCapabilityValue(capability, calibratedValue).catch(err => {
      this.error(`[CAP] Error setting ${capability}:`, err.message);
    });

    // v5.5.292: CRITICAL FIX - Trigger custom flow cards for alarm capabilities
    // This fixes the issue where custom flows defined in driver.compose.json never fired
    // because setCapabilityValue() doesn't trigger registerCapabilityListener()
    await this._triggerCustomFlowsIfNeeded(capability, calibratedValue, previousValue);
  }

  /**
   * v5.5.497: FORUM #933 FIX - Block bizarre values
   * Rudy_De_Vylder reported:
   * 1. Strange temp/humidity values on TZE200 presence sensors (don't have those sensors)
   * 2. Battery drops to 0% when sleeping, jumps to 100% when awake
   * @returns {boolean} true if value should be blocked
   */
  _blockBizarreValue(capability, value) {
    const driverType = this.driver?.id || '';

    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK 1: Temperature/Humidity on presence/radar sensors
    // These devices don't have temp/humidity sensors - values are garbage
    // ═══════════════════════════════════════════════════════════════════════
    const isPresenceRadar = driverType.includes('presence') || driverType.includes('radar') ||
      driverType.includes('motion_sensor_radar') || driverType.includes('mmwave');

    if (isPresenceRadar) {
      if (capability === 'measure_temperature') {
        this.log(`[SANITY] 🚫 BLOCKED: ${capability}=${value} on ${driverType} (no temp sensor)`);
        return true;
      }
      if (capability === 'measure_humidity') {
        this.log(`[SANITY] 🚫 BLOCKED: ${capability}=${value} on ${driverType} (no humidity sensor)`);
        return true;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK 2: Battery extreme jumps on sleepy devices
    // Problem: Battery shows 0% when sleeping, 100% when awake
    // Solution: Reject sudden 0%/100% jumps within short time
    // ═══════════════════════════════════════════════════════════════════════
    if (capability === 'measure_battery' && typeof value === 'number') {
      const currentBattery = this.getCapabilityValue('measure_battery');
      const now = Date.now();

      // Initialize tracking
      if (!this._batteryJumpTracker) {
        this._batteryJumpTracker = { lastValue: null, lastTime: 0 };
      }

      // Detect extreme jump (0↔100 within 5 minutes)
      if (currentBattery !== null && currentBattery !== undefined) {
        const jump = Math.abs(value - currentBattery);
        const timeSinceLastUpdate = now - this._batteryJumpTracker.lastTime;
        const JUMP_THRESHOLD = 80; // 80% jump is suspicious
        const MIN_TIME_FOR_REAL_CHANGE = 300000; // 5 minutes

        if (jump >= JUMP_THRESHOLD && timeSinceLastUpdate < MIN_TIME_FOR_REAL_CHANGE) {
          // Check if it's the suspicious 0↔100 pattern
          if ((value === 0 && currentBattery >= 90) || (value >= 90 && currentBattery <= 10)) {
            this.log(`[SANITY] 🚫 BLOCKED: Battery jump ${currentBattery}%→${value}% in ${Math.round(timeSinceLastUpdate / 1000)}s (sleepy device artifact)`);
            return true;
          }
        }

        // Block 0% specifically if current battery is reasonable
        if (value === 0 && currentBattery > 20) {
          this.log(`[SANITY] 🚫 BLOCKED: Battery ${currentBattery}%→0% (sleepy device sleep artifact)`);
          return true;
        }
      }

      // Update tracker
      this._batteryJumpTracker.lastValue = value;
      this._batteryJumpTracker.lastTime = now;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BLOCK 3: Extreme temperature/humidity values (obvious garbage)
    // ═══════════════════════════════════════════════════════════════════════
    if (capability === 'measure_temperature' && typeof value === 'number') {
      if (value < -40 || value > 85) {
        this.log(`[SANITY] 🚫 BLOCKED: Temperature ${value}°C out of valid range (-40 to 85)`);
        return true;
      }
    }

    if (capability === 'measure_humidity' && typeof value === 'number') {
      if (value < 0 || value > 100) {
        this.log(`[SANITY] 🚫 BLOCKED: Humidity ${value}% out of valid range (0-100)`);
        return true;
      }
      // Block 655.4% humidity (known firmware bug value)
      if (value > 100) {
        this.log(`[SANITY] 🚫 BLOCKED: Humidity ${value}% (firmware bug value)`);
        return true;
      }
    }

    return false; // Value is OK
  }

  /**
   * v5.5.292: Trigger custom flow cards for alarm capabilities
   * Called from _safeSetCapability when capability values change
   */
  async _triggerCustomFlowsIfNeeded(capability, value, previousValue) {
    // Only trigger on actual state CHANGES (not repeats)
    if (value === previousValue) return;

    try {
      const driverId = this.driver?.id || '';

      // Smoke detector flows - v5.5.592: FIXED - Use correct card ID format
      if (capability === 'alarm_smoke') {
        const cardIds = value 
          ? [`${driverId}_alarm_smoke_true`, 'smoke_detector_advanced_alarm_smoke_true', 'smoke_alarm_triggered']
          : [`${driverId}_alarm_smoke_false`, 'smoke_detector_advanced_alarm_smoke_false', 'smoke_alarm_cleared'];
        
        for (const cardId of cardIds) {
          try {
            const card = this.homey.flow.getDeviceTriggerCard(cardId);
            if (card) {
              await card.trigger(this, { smoke: value });
              this.log(`[FLOW] 🔥 Triggered: ${cardId}`);
              break;
            }
          } catch (e) {
            // Try next card ID
          }
        }
      }

      // Gas sensor flows - v5.5.592: FIXED - Use correct card ID format
      if (capability === 'alarm_gas') {
        const cardIds = value 
          ? [`${driverId}_alarm_gas_true`, 'gas_sensor_alarm_gas_true', 'gas_alarm_triggered']
          : [`${driverId}_alarm_gas_false`, 'gas_sensor_alarm_gas_false', 'gas_alarm_cleared'];
        
        for (const cardId of cardIds) {
          try {
            const card = this.homey.flow.getDeviceTriggerCard(cardId);
            if (card) {
              await card.trigger(this, { gas: value });
              this.log(`[FLOW] ⛽ Triggered: ${cardId}`);
              break;
            }
          } catch (e) {
            // Try next card ID
          }
        }
      }

      // Water leak sensor flows - v5.5.592: FIXED - Use correct card ID format
      if (capability === 'alarm_water') {
        // Card IDs as defined in driver.flow.compose.json
        const cardIds = value 
          ? [`${driverId}_alarm_water_true`, 'water_leak_sensor_alarm_water_true', 'water_leak_detected']
          : [`${driverId}_alarm_water_false`, 'water_leak_sensor_alarm_water_false', 'water_leak_cleared'];
        
        for (const cardId of cardIds) {
          try {
            const card = this.homey.flow.getDeviceTriggerCard(cardId);
            if (card) {
              await card.trigger(this, { water: value });
              this.log(`[FLOW] 💧 Triggered: ${cardId}`);
              break; // Success - don't try other cards
            }
          } catch (e) {
            // Try next card ID
          }
        }
      }

      // Contact sensor flows - v5.5.592: FIXED - Use correct card ID format
      if (capability === 'alarm_contact') {
        const cardIds = value 
          ? [`${driverId}_alarm_contact_true`, 'contact_sensor_alarm_contact_true', `${driverId}_contact_opened`, 'contact_opened']
          : [`${driverId}_alarm_contact_false`, 'contact_sensor_alarm_contact_false', `${driverId}_contact_closed`, 'contact_closed'];
        
        for (const cardId of cardIds) {
          try {
            const card = this.homey.flow.getDeviceTriggerCard(cardId);
            if (card) {
              await card.trigger(this, {});
              this.log(`[FLOW] 🚪 Triggered: ${cardId}`);
              break;
            }
          } catch (e) {
            // Try next card ID
          }
        }
      }

      // Illuminance change flow - v5.5.588: Try driver-specific cards first
      if (capability === 'measure_luminance' && typeof value === 'number') {
        const driverCardId = `${driverId}_illuminance_changed`;
        try {
          await this.homey.flow.getDeviceTriggerCard(driverCardId).trigger(this, { lux: value });
        } catch {
          try {
            await this.homey.flow.getDeviceTriggerCard('motion_illuminance_changed').trigger(this, { lux: value });
          } catch { /* No flow card */ }
        }
      }

    } catch (err) {
      // Silent - flow card may not exist for this driver
    }
  }

  /**
   * v5.5.28: Apply calibration offset from settings
   * @param {string} capability - Capability name
   * @param {any} value - Raw value
   * @returns {any} - Calibrated value
   */
  _applyCalibration(capability, value) {
    // Only calibrate numeric values
    if (typeof value !== 'number') return value;

    const settings = this.getSettings?.() || {};

    switch (capability) {
      case 'measure_temperature':
        const tempOffset = parseFloat(settings.temperature_calibration) || 0;
        if (tempOffset !== 0) {
          const calibrated = Math.round((value + tempOffset) * 10) / 10;
          this.log(`[CALIBRATION] Temperature: ${value}°C + ${tempOffset}°C = ${calibrated}°C`);
          return calibrated;
        }
        break;

      case 'measure_humidity':
        // Check both humidity_calibration and moisture_calibration (for soil sensors)
        const humOffset = parseFloat(settings.humidity_calibration || settings.moisture_calibration) || 0;
        if (humOffset !== 0) {
          const calibrated = Math.round(value + humOffset);
          this.log(`[CALIBRATION] Humidity: ${value}% + ${humOffset}% = ${calibrated}%`);
          return calibrated;
        }
        break;
    }

    return value;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITY REGISTRATION OVERRIDE (Block ZCL for Tuya DP)
  // ═══════════════════════════════════════════════════════════════════════════

  async registerCapability(capabilityId, clusterId, opts) {
    if (this._isPureTuyaDP) {
      this.log(`[ZCL-GUARD] 🛑 registerCapability(${capabilityId}) BLOCKED - Tuya DP device`);
      return;
    }
    return super.registerCapability(capabilityId, clusterId, opts);
  }

  async registerAllCapabilitiesWithReporting() {
    if (this._isPureTuyaDP) {
      this.log('[ZCL-GUARD] 🛑 registerAllCapabilitiesWithReporting() BLOCKED - Tuya DP device');
      return;
    }
    return super.registerAllCapabilitiesWithReporting();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TUYA STATUS HANDLER (called by TuyaSpecificClusterDevice or TuyaEF00Manager)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * v5.3.82: CRITICAL - Handle Tuya status reports
   * This method is called when Tuya DP data is received
   */
  onTuyaStatus(status) {
    this.log('[TUYA-STATUS] ════════════════════════════════════════════════════');
    this.log('[TUYA-STATUS] 📥 Received Tuya status data!');
    this.log('[TUYA-STATUS] Raw data:', JSON.stringify(status));

    try {
      // Handle different status formats
      if (Array.isArray(status)) {
        // Array of datapoints: [{dp: 1, value: 230}, {dp: 2, value: 65}]
        for (const item of status) {
          const dp = item.dp || item.dpId || item.id;
          const value = item.value !== undefined ? item.value : item.data;
          if (dp !== undefined && value !== undefined) {
            this._handleDP(dp, value);
          }
        }
      } else if (typeof status === 'object' && status !== null) {
        // Object with datapoints property
        if (status.datapoints) {
          for (const dp of status.datapoints) {
            this._handleDP(dp.dp || dp.dpId, dp.value || dp.data);
          }
        }
        // Object with numeric keys (DP IDs)
        for (const [key, value] of Object.entries(status)) {
          const dp = parseInt(key);
          if (!isNaN(dp) && value !== undefined) {
            this._handleDP(dp, value);
          }
        }
        // Single DP object
        if (status.dp !== undefined || status.dpId !== undefined) {
          const dp = status.dp || status.dpId;
          const value = status.value !== undefined ? status.value : status.data;
          this._handleDP(dp, value);
        }
      }
    } catch (err) {
      this.error('[TUYA-STATUS] Error processing status:', err.message);
    }

    this.log('[TUYA-STATUS] ════════════════════════════════════════════════════');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current sensor values
   */
  getSensorValues() {
    return { ...this._sensorValues };
  }

  /**
   * Get last update timestamp
   */
  getLastUpdate() {
    return this._lastUpdate;
  }

  /**
   * Check if device is Tuya DP
   */
  isTuyaDP() {
    return this._protocolInfo?.isTuyaDP || false;
  }

  /**
   * Log available clusters (for debugging)
   */
  logClusters() {
    try {
      const endpoints = this.zclNode?.endpoints || {};
      for (const [epId, ep] of Object.entries(endpoints)) {
        const clusters = Object.keys(ep?.clusters || {});
        this.log(`[CLUSTERS] Endpoint ${epId}: ${clusters.join(', ') || '(none)'}`);
      }
    } catch (err) {
      this.log('[CLUSTERS] Error:', err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v5.5.27: TuyaDataQuery Integration
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * v5.5.27: Query Tuya DPs - standardized DP query method
   * @param {number|number[]} dpIds - DP IDs to query
   * @param {Object} options - Query options
   */
  async tuyaDataQuery(dpIds, options = {}) {
    return tuyaDataQuery(this, dpIds, options);
  }

  /**
   * v5.5.27: Safe query for sleepy devices - respects wake windows
   * @param {number|number[]} dpIds - DP IDs to query
   * @param {Object} options - Query options
   */
  async safeTuyaDataQuery(dpIds, options = {}) {
    return safeTuyaDataQuery(this, dpIds, options);
  }

  /**
   * v5.5.27: Check if this device is a sleepy end device
   * @returns {boolean}
   */
  isSleepyEndDevice() {
    return isSleepyEndDevice(this);
  }

  /**
   * v5.5.27: Update last radio activity timestamp
   * Call this from DP/ZCL handlers to track device wake state
   * v5.5.33: Also mark device awake for HybridDataQuery
   * v5.5.111: Also read battery while device is awake!
   */
  updateRadioActivity() {
    updateRadioActivity(this);

    // v5.5.33: Mark awake for hybrid queries
    if (this._hybridDataQuery) {
      this._hybridDataQuery.markAwake();
    }

    // v5.5.111: Read battery while device is awake (for sleepy devices)
    // Only if battery-powered and not read recently (debounce 5 min)
    if (!this.mainsPowered && this.hasCapability('measure_battery')) {
      const now = Date.now();
      const lastRead = this._lastBatteryRead || 0;
      const BATTERY_READ_INTERVAL = 5 * 60 * 1000; // 5 minutes

      if (now - lastRead > BATTERY_READ_INTERVAL) {
        this._lastBatteryRead = now;
        this._readBatteryWhileAwake();
      }
    }
  }

  /**
   * v5.5.118: Smart battery reading for sleepy devices
   * - Called automatically from updateRadioActivity() with 5min debounce
   * - Keep previous value if read fails (device went back to sleep)
   * - Timeout prevents hanging
   * - Clear logging of value changes
   */
  async _readBatteryWhileAwake() {
    const currentBattery = this.getCapabilityValue('measure_battery');

    try {
      const ep1 = this.zclNode?.endpoints?.[1];
      if (!ep1) return;

      const powerCluster =
        ep1.clusters?.powerConfiguration ||
        ep1.clusters?.genPowerCfg ||
        ep1.clusters?.[0x0001];

      if (!powerCluster?.readAttributes) {
        return; // Silent - no power cluster
      }

      this.log(`[BATTERY-WAKE] 🔋 Current: ${currentBattery}% - reading while awake...`);

      const data = await Promise.race([
        powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
      ]);

      if (data?.batteryPercentageRemaining !== undefined && data.batteryPercentageRemaining !== 255) {
        const battery = Math.round(data.batteryPercentageRemaining / 2);
        this.log(`[BATTERY-WAKE] 🔋 Battery UPDATED: ${currentBattery}% → ${battery}%`);
        await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
      } else if (data?.batteryVoltage !== undefined && data.batteryVoltage > 0) {
        // Fallback: estimate from voltage (CR2450/CR2032: 3.0V=100%, 2.0V=0%)
        const voltage = data.batteryVoltage / 10;
        const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
        this.log(`[BATTERY-WAKE] 🔋 Battery UPDATED (voltage): ${currentBattery}% → ${battery}%`);
        await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { });
      } else {
        this.log(`[BATTERY-WAKE] 🔋 No valid data - KEEPING: ${currentBattery}%`);
      }
    } catch (e) {
      // Device went back to sleep - keep previous value
      this.log(`[BATTERY-WAKE] 🔋 Device sleeping - KEEPING: ${currentBattery}%`);
    }
  }

  /**
   * v5.5.27: Generic refresh handler for Flow Cards
   * Override refreshAll() in subclass to implement device-specific refresh
   */
  async onFlowCardRefresh() {
    this.log('[REFRESH] Flow card refresh triggered');

    if (typeof this.refreshAll === 'function') {
      return this.refreshAll();
    }
    if (typeof this.refreshBattery === 'function') {
      return this.refreshBattery();
    }

    // Default: query common DPs based on device mappings
    const dpIds = Object.keys(this.dpMappings || {}).map(Number).filter(n => !isNaN(n));
    if (dpIds.length > 0) {
      this.log(`[REFRESH] Querying ${dpIds.length} DPs: [${dpIds.join(', ')}]`);
      return this.safeTuyaDataQuery(dpIds, { logPrefix: '[REFRESH]' });
    }

    this.log('[REFRESH] No refresh method or dpMappings available');
    return false;
  }

  /**
   * v5.5.28: Sync device time (for devices with clocks/displays)
   * Uses TuyaTimeSync module
   * @param {Object} options - Sync options
   */
  async syncTime(options = {}) {
    return syncDeviceTime(this, options);
  }

  /**
   * v5.5.31: Force immediate data recovery
   * Useful for manual refresh or Flow Card action
   */
  async forceDataRecovery() {
    this.log('[HYBRID-SENSOR] 🚨 Force data recovery triggered');

    if (this._dataRecoveryManager) {
      await this._dataRecoveryManager.forceRecovery();
    } else {
      // Fallback: use existing retry mechanism
      await this._forceDataRetry?.();
    }

    return true;
  }

  /**
   * v5.5.27: Get DP presets for this device type
   * @returns {Object} DP preset constants
   */
  static get DP_PRESETS() {
    return DP_PRESETS;
  }

  /**
   * v5.5.25: Clean up timers on device deletion
   */
  async onDeleted() {
    this.log('[HYBRID-SENSOR] Device deleted - cleaning up...');

    // Clear dataQuery interval
    if (this._dataQueryInterval) {
      clearInterval(this._dataQueryInterval);
      this._dataQueryInterval = null;
    }

    // Clear optimization timer
    if (this._optimizationTimer) {
      clearTimeout(this._optimizationTimer);
      this._optimizationTimer = null;
    }

    // v5.5.30: Clear data retry timers
    if (this._dataRetryTimer) {
      clearTimeout(this._dataRetryTimer);
      this._dataRetryTimer = null;
    }
    if (this._secondRetryTimer) {
      clearTimeout(this._secondRetryTimer);
      this._secondRetryTimer = null;
    }

    // v5.5.33: Clear capability status timer
    if (this._capabilityStatusTimer) {
      clearTimeout(this._capabilityStatusTimer);
      this._capabilityStatusTimer = null;
    }

    // v5.5.31: Clean up DataRecoveryManager
    if (this._dataRecoveryManager) {
      this._dataRecoveryManager.destroy();
      this._dataRecoveryManager = null;
    }

    // Clear TuyaEF00Manager
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.removeAllListeners?.();
      this.tuyaEF00Manager = null;
    }

    // Clear UniversalDataHandler
    if (this.universalDataHandler) {
      this.universalDataHandler.removeAllListeners?.();
      this.universalDataHandler = null;
    }

    // v5.5.63: Clear ProtocolAutoOptimizer
    if (this.protocolOptimizer) {
      this.protocolOptimizer.destroy();
      this.protocolOptimizer = null;
    }

    this.log('[HYBRID-SENSOR] ✅ Cleanup complete');
  }
}

module.exports = {
  HybridSensorBase
};
