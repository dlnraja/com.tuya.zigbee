'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const { configureReportingWithRetry } = require('../utils/ZigbeeRetry');
const BatteryManager = require('../battery/BatteryManager');
const BatteryReportingManager = require('../utils/battery-reporting-manager');
const PowerManager = require('../managers/PowerManager');
const ZigbeeHelpers = require('../zigbee/ZigbeeHelpers');
const ZigbeeTimeout = require('../zigbee/ZigbeeTimeout');
const ReportingConfig = require('../utils/ReportingConfig');
const IASZoneManager = require('../managers/IASZoneManager');
const MultiEndpointManager = require('../managers/MultiEndpointManager');
const TuyaEF00Manager = require('../tuya/TuyaEF00Manager');
const { applyTS0601EmergencyFix } = require('../tuya/TS0601_EMERGENCY_FIX');
const IntelligentProtocolRouter = require('../protocol/IntelligentProtocolRouter');
const TuyaSyncManager = require('../tuya/TuyaSyncManager');
const MultiEndpointCommandListener = require('../zigbee/MultiEndpointCommandListener');
const DynamicCapabilityManager = require('../managers/DynamicCapabilityManager');
const UniversalVariantManager = require('../managers/UniversalVariantManager');
const FlowTriggerHelpers = require('../flow/FlowTriggerHelpers');
const HardwareDetectionShim = require('../protocol/HardwareDetectionShim');
const TitleSanitizer = require('../utils/TitleSanitizer');
const { removeBatteryFromACDevices, ensureSingleBatteryCapability } = require('../helpers/powerUtils');
const SmartDriverAdaptation = require('../managers/SmartDriverAdaptation');
const DriverMigrationManager = require('../managers/DriverMigrationManager');
const IntelligentDataManager = require('../managers/IntelligentDataManager');
const AutonomousMigrationManager = require('../managers/AutonomousMigrationManager');
const { cleanupCapabilities, needsCleanup } = require('../helpers/CapabilityCleanup');
const SDK3BestPractices = require('../SDK3BestPractices');
const PeriodicAutoEnricherMixin = require('../mixins/PeriodicAutoEnricherMixin');
const { PROTOCOL, detectProtocol, initZCL, initTuyaDP, sendTuyaDP } = require('../helpers/UniversalDriverInit');

// v5.5.672: Permissive Pairing + Global TimeSync + Hybrid Arbitration
let TwoPhaseEnrichment, EventDeduplicator, PermissiveMatchingEngine, EnrichmentScheduler;
let GlobalTimeSyncEngine, HybridProtocolArbitrator;
try {
  const pairingModule = require('../pairing');
  TwoPhaseEnrichment = pairingModule.TwoPhaseEnrichment;
  EventDeduplicator = pairingModule.EventDeduplicator;
  PermissiveMatchingEngine = pairingModule.PermissiveMatchingEngine;
  EnrichmentScheduler = pairingModule.EnrichmentScheduler;
} catch (e) {
  TwoPhaseEnrichment = null;
  EventDeduplicator = null;
  PermissiveMatchingEngine = null;
  EnrichmentScheduler = null;
}
try {
  GlobalTimeSyncEngine = require('../tuya/GlobalTimeSyncEngine');
  HybridProtocolArbitrator = require('../protocol/HybridProtocolArbitrator');
} catch (e) {
  GlobalTimeSyncEngine = null;
  HybridProtocolArbitrator = null;
}

// v5.5.649: Universal Zigbee Protocol Handler for all profiles and manufacturer clusters
let UniversalZigbeeProtocol;
try {
  const uzpModule = require('../UniversalZigbeeProtocol');
  UniversalZigbeeProtocol = uzpModule.UniversalZigbeeProtocol;
} catch (e) {
  UniversalZigbeeProtocol = null;
}

// v5.5.373: Intelligent Device Adapter - Auto-learns and adapts capabilities
let IntelligentDeviceAdapter, IntelligentBatteryManager, IntelligentPowerManager;
try {
  const intelligentModule = require('../intelligent/IntelligentDeviceAdapter');
  IntelligentDeviceAdapter = intelligentModule.IntelligentDeviceAdapter;
  IntelligentBatteryManager = intelligentModule.IntelligentBatteryManager;
  IntelligentPowerManager = intelligentModule.IntelligentPowerManager;
} catch (e) {
  IntelligentDeviceAdapter = null;
  IntelligentBatteryManager = null;
  IntelligentPowerManager = null;
}

// v5.5.32: DataRecoveryManager for automatic data recovery on ALL devices
let DataRecoveryManager;
try {
  DataRecoveryManager = require('../tuya/DataRecoveryManager').DataRecoveryManager;
} catch (e) {
  DataRecoveryManager = null;
}

// v5.5.33: HybridDataQuery for TRUE HYBRID (ZCL + Tuya DP) queries
let HybridDataQuery, ZigbeeDataQuery;
try {
  const zigbeeQueryModule = require('../zigbee/ZigbeeDataQuery');
  HybridDataQuery = zigbeeQueryModule.HybridDataQuery;
  ZigbeeDataQuery = zigbeeQueryModule.ZigbeeDataQuery;
} catch (e) {
  HybridDataQuery = null;
  ZigbeeDataQuery = null;
}

// v5.3.30: Import new helpers from JohanBendz analysis
let BatteryRouter;
try {
  BatteryRouter = require('../helpers/BatteryRouter');
} catch (e) {
  BatteryRouter = null;
}

let IASZoneEnhanced;
try {
  IASZoneEnhanced = require('../managers/IASZoneEnhanced');
} catch (e) {
  IASZoneEnhanced = null;
}

// v5.3.62: Import adaptive data parser for universal data handling
let AdaptiveDataParser;
try {
  AdaptiveDataParser = require('../utils/AdaptiveDataParser');
} catch (e) {
  AdaptiveDataParser = null;
}

// v5.2.9: Import diagnostics tool
let DeviceDiagnostics;
try {
  DeviceDiagnostics = require('../diagnostics/DeviceDiagnostics');
} catch (e) {
  DeviceDiagnostics = null;
}

/**
 * BaseHybridDevice - Universal base class for hybrid power devices
 * Supports AC, DC, and Battery power sources with auto-detection
 * SDK3 Compliant - NO alarm_battery, uses measure_battery only
 * Enhanced with intelligent battery management and accurate calculations
 */
class BaseHybridDevice extends ZigBeeDevice {

  constructor(...args) {
    super(...args);

    // v5.2.86: Early Tuya DP detection to prevent ZCL timeouts
    this._isPureTuyaDP = this._detectPureTuyaDP();
    if (this._isPureTuyaDP) {
      console.log('[TUYA-EARLY] 🔶 Pure Tuya DP device detected in constructor');
    }

    // Robust promise initialisation to avoid "reading 'resolve' of undefined"
    // Use named fields so drivers can call this._setAvailableResolve safely.
    this._availability = {
      promise: new Promise((resolve, reject) => {
        this._availabilityResolve = resolve;
        this._availabilityReject = reject;
      }),
      resolved: false,
    };

    // Helper: safe set available
    this._safeResolveAvailable = (value) => {
      try {
        if (typeof this._availabilityResolve === 'function' && !this._availability.resolved) {
          this._availabilityResolve(value);
          this._availability.resolved = true;
        }
      } catch (err) {
        this.log('[ERROR] safeResolveAvailable failed:', err);
      }
    };

    // Inverse: safe reject
    this._safeRejectAvailable = (err) => {
      try {
        if (typeof this._availabilityReject === 'function' && !this._availability.resolved) {
          this._availabilityReject(err);
          this._availability.resolved = true;
        }
      } catch (e) {
        this.log('[ERROR] safeRejectAvailable failed:', e);
      }
    };
  }

  /**
   * SDK Best Practice: Set capability value and update lastSeenAt
   *
   * "setLastSeenAt - Set a device's lastSeenAt property. This method should be
   * called if the device is known to be alive and responding."
   * Note: Available since Homey v12.6.1
   *
   * @param {string} capabilityId - Capability ID
   * @param {any} value - Value to set
   * @returns {Promise}
   */
  async safeSetCapabilityValue(capabilityId, value) {
    try {
      // v5.5.313: Check if device is still available (not deleted)
      if (this._deleted || !this.homey) {
        return false; // Device deleted, silently ignore
      }

      // v5.3.61: Try to add capability if missing (auto-migration)
      if (!this.hasCapability(capabilityId)) {
        // Check if this capability is in the driver manifest
        const manifestCaps = this.driver?.manifest?.capabilities || [];
        if (manifestCaps.includes(capabilityId)) {
          try {
            await this.addCapability(capabilityId);
            this.log(`[SAFE-SET] ➕ Auto-added missing capability: ${capabilityId}`);
          } catch (addErr) {
            this.log(`[SAFE-SET] ⚠️ Could not add ${capabilityId}: ${addErr.message}`);
            return false;
          }
        } else {
          return false; // Not in manifest, don't add
        }
      }

      await this.setCapabilityValue(capabilityId, value);

      // v5.5.373: Record data point for intelligent adapter
      if (this.intelligentAdapter && typeof this.intelligentAdapter.recordDataPoint === 'function') {
        this.intelligentAdapter.recordDataPoint(capabilityId, value, 'setCapabilityValue');
      }

      // SDK v12.6.1+: Update lastSeenAt when device communicates
      if (typeof this.setLastSeenAt === 'function') {
        this.setLastSeenAt();
      }

      return true;
    } catch (err) {
      this.error(`[SDK] Failed to set ${capabilityId}:`, err.message);
      return false;
    }
  }

  // ============================================================================
  // v5.3.62: ADAPTIVE DATA PARSING METHODS (available to ALL drivers)
  // ============================================================================

  /**
   * Parse any raw data using AdaptiveDataParser
   * @param {any} data - Raw data in any format
   * @param {string} context - Context hint (e.g., 'temperature', 'humidity')
   * @returns {Object} Parsed data { value, type, raw, parsed }
   */
  parseData(data, context = 'unknown') {
    if (AdaptiveDataParser) {
      return AdaptiveDataParser.parse(data, context);
    }
    // Fallback
    return { value: data, type: typeof data, raw: data, parsed: false };
  }

  /**
   * Convert raw value to temperature (°C)
   * Works with: raw numbers, buffers, strings, Tuya DP values
   */
  parseTemperature(value, options = {}) {
    if (AdaptiveDataParser) {
      return AdaptiveDataParser.toTemperature(value, options);
    }
    // Fallback
    let temp = typeof value === 'number' ? value : parseFloat(value);
    if (Math.abs(temp) > 100) temp = temp / 10;
    if (Math.abs(temp) > 100) temp = temp / 10;
    return Math.round(temp * 10) / 10;
  }

  /**
   * Convert raw value to humidity (%)
   * Works with: raw numbers, buffers, strings, Tuya DP values
   */
  parseHumidity(value, options = {}) {
    if (AdaptiveDataParser) {
      return AdaptiveDataParser.toHumidity(value, options);
    }
    // Fallback
    let humidity = typeof value === 'number' ? value : parseFloat(value);
    if (humidity > 100) humidity = humidity / 10;
    return Math.max(0, Math.min(100, Math.round(humidity)));
  }

  /**
   * Convert raw value to battery percentage (%)
   * Works with: ZCL format (0-200), percentage, voltage
   */
  parseBattery(value, options = {}) {
    if (AdaptiveDataParser) {
      return AdaptiveDataParser.toBattery(value, options);
    }
    // Fallback
    let battery = typeof value === 'number' ? value : parseFloat(value);
    if (battery > 100 && battery <= 200) battery = battery / 2;
    return Math.max(0, Math.min(100, Math.round(battery)));
  }

  /**
   * Convert raw value to illuminance (lux)
   * Works with: ZCL log scale, raw lux values
   */
  parseIlluminance(value, options = {}) {
    if (AdaptiveDataParser) {
      return AdaptiveDataParser.toIlluminance(value, options);
    }
    // Fallback
    let lux = typeof value === 'number' ? value : parseFloat(value);
    if (lux > 10000) lux = Math.pow(10, (lux - 1) / 10000);
    return Math.max(0, Math.round(lux));
  }

  /**
   * Smart capability setter with auto-parsing
   * Automatically detects value type and converts appropriately
   */
  async smartSetCapability(capabilityId, rawValue) {
    let value = rawValue;

    // Auto-detect and convert based on capability type
    if (capabilityId.includes('temperature')) {
      value = this.parseTemperature(rawValue);
    } else if (capabilityId.includes('humidity')) {
      value = this.parseHumidity(rawValue);
    } else if (capabilityId.includes('battery')) {
      value = this.parseBattery(rawValue);
    } else if (capabilityId.includes('illuminance') || capabilityId.includes('luminance')) {
      value = this.parseIlluminance(rawValue);
    } else if (capabilityId.includes('alarm') || capabilityId.includes('onoff')) {
      // Boolean conversion
      const parsed = this.parseData(rawValue, 'boolean');
      value = Boolean(parsed.value);
    } else {
      // Generic parsing
      const parsed = this.parseData(rawValue, capabilityId);
      value = parsed.value;
    }

    this.log(`[SMART-SET] ${capabilityId}: raw=${JSON.stringify(rawValue)} → ${value}`);
    return this.safeSetCapabilityValue(capabilityId, value);
  }

  /**
   * v5.2.86: Early detection of pure Tuya DP devices (before ZCL operations)
   * v5.2.89: Enhanced detection with multiple fallback sources
   */
  _detectPureTuyaDP() {
    try {
      // Check ALL possible sources for model/manufacturer data
      const store = this.getStore?.() || {};
      const settings = this.getSettings?.() || {};
      const data = this.getData?.() || {};

      // Try multiple possible keys for model ID
      const modelId = settings.zb_modelId
        || store.modelId
        || data.modelId
        || settings.modelId
        || '';

      // Try multiple possible keys for manufacturer
      const mfr = settings.zb_manufacturerName
        || store.manufacturerName
        || data.manufacturerName
        || settings.manufacturerName
        || '';

      // v5.2.89: Log detection for debugging
      console.log(`[TUYA-DETECT] Constructor detection: model="${modelId}" mfr="${mfr}"`);

      // TS0601 or _TZE manufacturer = Pure Tuya DP
      if (modelId === 'TS0601' || mfr.startsWith('_TZE')) {
        console.log('[TUYA-DETECT] ✅ Pure Tuya DP device detected!');
        return true;
      }

      // v5.2.89: Also check driver ID as fallback
      const driverId = this.driver?.id || '';
      if (driverId === 'climate_sensor' || driverId === 'soil_sensor') {
        // These drivers are primarily for Tuya DP devices
        // We'll verify later, but assume Tuya DP to prevent timeouts
        console.log(`[TUYA-DETECT] ⚠️ Driver ${driverId} - assuming Tuya DP (will verify later)`);
        return true;
      }

      return false;
    } catch (err) {
      console.error('[TUYA-DETECT] Detection error:', err.message);
      return false;
    }
  }

  /**
   * v5.2.86: Override registerCapability to skip ZCL for Tuya DP devices
   */
  async registerCapability(capabilityId, cluster, opts) {
    // Skip ZCL cluster registration for pure Tuya DP devices
    if (this._isPureTuyaDP) {
      // Only skip if this is a ZCL cluster registration (not just capability listener)
      if (cluster && typeof cluster === 'object' && cluster.ID !== undefined) {
        console.log(`[TUYA-SKIP] Skipping ZCL registerCapability for ${capabilityId} (Tuya DP device)`);
        return;
      }
      if (typeof cluster === 'string' && cluster !== 'onoff') {
        // Allow onoff for switches, skip others for Tuya DP
        const skipClusters = ['powerConfiguration', 'temperatureMeasurement', 'relativeHumidity', 'illuminanceMeasurement'];
        if (skipClusters.includes(cluster)) {
          console.log(`[TUYA-SKIP] Skipping ZCL registerCapability for ${capabilityId} cluster ${cluster} (Tuya DP device)`);
          return;
        }
      }
    }

    // Call parent method for non-Tuya devices
    return super.registerCapability(capabilityId, cluster, opts);
  }

  /**
   * Initialize hybrid device with power detection
   * @param {Object} params - Homey passes { zclNode, firstInit }
   * @param {ZCLNode} params.zclNode - The Zigbee node (ALREADY INITIALIZED by Homey)
   */
  async onNodeInit({ zclNode }) {
    // v5.2.94: Guard against double initialization
    if (this._baseHybridInitialized) {
      this.log('[HYBRID] ⚠️ Already initialized (onNodeInit), skipping second init');
      return;
    }
    this._baseHybridInitialized = true;

    // ✅ CORRECT: zclNode is passed as PARAMETER by Homey!
    // Store it for use throughout the class
    this.zclNode = zclNode;

    console.log('✅ [ZCLNODE] zclNode received from Homey');

    // v5.3.61: Increase maxListeners on all endpoints to prevent warnings
    try {
      if (zclNode?.endpoints) {
        for (const endpointId of Object.keys(zclNode.endpoints)) {
          const endpoint = zclNode.endpoints[endpointId];
          if (endpoint && typeof endpoint.setMaxListeners === 'function') {
            endpoint.setMaxListeners(50);
          }
          // Also set on clusters
          if (endpoint?.clusters) {
            for (const cluster of Object.values(endpoint.clusters)) {
              if (cluster && typeof cluster.setMaxListeners === 'function') {
                cluster.setMaxListeners(50);
              }
            }
          }
        }
        this.log('[INIT] ✅ MaxListeners increased on all endpoints/clusters');
      }
    } catch (err) {
      // Non-critical
    }

    // 🚨 EMERGENCY LOG: This should ALWAYS appear if device initializes
    try {
      const name = this.getName ? this.getName() : 'unknown';
      const data = this.getData ? this.getData() : {};
      const id = data.id || data.ieee || 'no-id';
      console.log('🚨 [DEVICE START]', name, '|', id);
    } catch (err) {
      console.log('🚨 [DEVICE START] Error getting info:', err.message);
    }

    // CRITICAL: Store zclNode FIRST
    this.zclNode = zclNode;

    try {
      this.log('════════════════════════════════════════════════════════════════════════════════');
      this.log('🔧 DIAGNOSTIC MODE - Detailed Device Information');
      this.log('════════════════════════════════════════════════════════════════════════════════');
      this.log('BaseHybridDevice initializing...');

      // Log device identity FIRST for diagnostics
      await this.logDeviceIdentity();

      // v5.2.89: LATE VERIFICATION of Tuya DP detection
      // Constructor might not have had access to all data - re-check now
      if (!this._isPureTuyaDP) {
        const settings = this.getSettings?.() || {};
        const store = this.getStore?.() || {};
        const modelId = settings.zb_modelId || store.modelId || '';
        const mfr = settings.zb_manufacturerName || store.manufacturerName || '';

        if (modelId === 'TS0601' || mfr.startsWith('_TZE')) {
          this.log('[TUYA-LATE] ⚠️ Re-detecting as Pure Tuya DP device!');
          this.log(`[TUYA-LATE] Model: ${modelId}, Manufacturer: ${mfr}`);
          this._isPureTuyaDP = true;
        }
      }

      this.log(`[INIT] _isPureTuyaDP = ${this._isPureTuyaDP}`);

      // v5.5.649: Initialize Universal Zigbee Protocol analyzer
      if (UniversalZigbeeProtocol) {
        try {
          this._universalProtocol = new UniversalZigbeeProtocol(this);
          const profile = this._universalProtocol.detectProfile(zclNode);
          this.log(`[ZIGBEE] Detected profile: ${profile}`);
        } catch (e) {
          this.log('[ZIGBEE] Protocol analyzer init error:', e.message);
        }
      }

      // CRITICAL: Migrate missing capabilities for existing devices
      await this.migrateCapabilities();

      this.log('[INIT] Defaults set: { powerType: \'BATTERY\', batteryType: \'CR2032\' }');

    } catch (err) {
      this.error('[IDENTITY] Could not log device identity:', err.message);
    }

    // Initialize with safe defaults FIRST
    try {
      this.powerType = 'BATTERY'; // Safe default
      this.batteryType = 'CR2032'; // Safe default
      this._initializationComplete = false;

      // Initialize managers (CRITICAL fixes from forum feedback)
      this.iasZoneManager = new IASZoneManager(this);
      this.multiEndpointManager = new MultiEndpointManager(this);
      this.tuyaEF00Manager = new TuyaEF00Manager(this);
      this.protocolRouter = new IntelligentProtocolRouter(this);
      this.syncManager = new TuyaSyncManager(this);
      this.commandListener = new MultiEndpointCommandListener(this);
      this.flowTriggers = new FlowTriggerHelpers(this);

      // 🧠 Initialize INTELLIGENT managers for enhanced functionality
      this.batteryManager = new BatteryManager();
      this.batteryReportingManager = new BatteryReportingManager(this);
      this.powerManager = new PowerManager();
      this.intelligentDataManager = new IntelligentDataManager(this);
      this.dynamicCapabilityManager = new DynamicCapabilityManager(this);
      
      // v5.5.927: Universal Variant Manager - dynamic capability detection for manufacturer variants
      this.variantManager = new UniversalVariantManager(this);
      this.variantManager.init().catch(e => this.error('[VARIANT] Init error:', e.message));

      // v5.3.30: Initialize JohanBendz analysis helpers
      if (IASZoneEnhanced) {
        this.iasZoneEnhanced = new IASZoneEnhanced(this);
        this.log('[INIT] ✅ IASZoneEnhanced manager initialized');
      }

      // v5.5.671: Initialize Permissive Matching Engine (CRITICAL - admit first, enrich later)
      if (PermissiveMatchingEngine) {
        this.permissiveMatching = new PermissiveMatchingEngine(this);
        this.log('[INIT] ✅ PermissiveMatchingEngine initialized');
      }

      // v5.5.671: Initialize Enrichment Scheduler (retry-based post-pairing)
      if (EnrichmentScheduler) {
        this.enrichmentScheduler = new EnrichmentScheduler(this);
        this.log('[INIT] ✅ EnrichmentScheduler initialized');
      }

      // v5.5.670: Initialize 2-Phase Enrichment System (CRITICAL for pairing)
      if (TwoPhaseEnrichment) {
        this.twoPhaseEnrichment = new TwoPhaseEnrichment(this);
        this.log('[INIT] ✅ TwoPhaseEnrichment system initialized');
      }
      
      // v5.5.670: Initialize Event Deduplicator (prevents double flow triggers)
      if (EventDeduplicator) {
        this.eventDeduplicator = new EventDeduplicator(this, 300);
        this.log('[INIT] ✅ EventDeduplicator initialized (300ms window)');
      }

      // v5.5.672: Initialize Global TimeSync Engine (CRITICAL for Tuya sensors)
      if (GlobalTimeSyncEngine) {
        this.globalTimeSync = new GlobalTimeSyncEngine(this);
        this.log('[INIT] ✅ GlobalTimeSyncEngine initialized');
      }

      // v5.5.672: Initialize Hybrid Protocol Arbitrator (ZCL vs Tuya DP)
      if (HybridProtocolArbitrator) {
        this.protocolArbitrator = new HybridProtocolArbitrator(this);
        this.log('[INIT] ✅ HybridProtocolArbitrator initialized');
      }

      this.log('[INIT] ✅ Intelligent managers initialized: Battery, Power, Data, Capability');

      console.log('✅ [INIT] Defaults set:', { powerType: this.powerType, batteryType: this.batteryType });
    } catch (err) {
      console.error('⚠️ [INIT] Error setting defaults:', err.message);
    }

    // CRITICAL FIX: Mark device as available IMMEDIATELY with safe defaults
    // This prevents hanging and allows device to work while detection runs in background
    try {
      console.log('⚡ [AVAILABILITY] Setting device available...');
      await Promise.resolve(this.setAvailable()).catch(err => {
        console.error('⚠️ [AVAILABILITY] setAvailable failed:', err.message);
        this.error('setAvailable failed:', err);
      });

      // Safe resolve availability promise
      this._safeResolveAvailable(true);

      this.log('[OK] ✅ Device available (using safe defaults, background init starting...)');
      console.log('✅ [AVAILABILITY] Device marked available');
    } catch (err) {
      console.error('❌ [AVAILABILITY] Failed to set available:', err.message);
      this.error('Failed to set available:', err);
      this._safeRejectAvailable(err);
    }

    // Run power detection and configuration in BACKGROUND (non-blocking)
    // This prevents any slow/hanging operation from blocking device initialization
    try {
      this.log('\n⚡ POWER DETECTION (Background):');
      console.log('🔄 [BACKGROUND] Starting background initialization...');
      Promise.resolve(this._runBackgroundInitialization()).catch(err => {
        console.error('⚠️ [BACKGROUND] Background init failed:', err.message);
        this.error('Background initialization failed:', err.message);
        this.log('[WARN] Device will use safe defaults (Battery/CR2032)');
      });
    } catch (err) {
      console.error('❌ [BACKGROUND] Failed to start background init:', err.message);
    }

    try {
      this.log('BaseHybridDevice initialized immediately with safe defaults');
      this.log('Background detection started for intelligent power management');
      console.log('✅ [COMPLETE] onNodeInit complete - device ready');

      // v5.3.21: Hint for battery indicator
      if (this.hasCapability('measure_battery')) {
        this.log('');
        this.log('💡 TIP: To show battery % on device tile:');
        this.log('   Device Settings → Status Indicator → Select "Battery"');
        this.log('');
      }
    } catch (err) {
      console.error('⚠️ [COMPLETE] Error logging completion:', err.message);
    }
  }

  /**
   * Run power detection and configuration in background
   * Non-blocking, won't prevent device from working
   *
   * HOMEY BEST PRACTICE: Use isFirstInit() for actions only needed once
   */
  async _runBackgroundInitialization() {
    try {
      // Step 1: Detect power source (with timeout)
      this.log('[BACKGROUND] Step 1/3: Detecting power source...');
      await this.detectPowerSource();
      this.log(`[BACKGROUND] Power source detected: ${this.powerType}`);

      // HOMEY BEST PRACTICE: Only do heavy init on first pairing
      const isFirst = this.isFirstInit();
      if (isFirst) {
        this.log('[BACKGROUND] 🆕 First initialization detected - full setup');
        
        // v5.5.670: CRITICAL - Run 2-Phase Enrichment for new devices
        if (this.twoPhaseEnrichment && this.zclNode) {
          this.log('[BACKGROUND] 🔄 Starting 2-Phase Enrichment (Phase 1)...');
          try {
            const enrichResult = await this.twoPhaseEnrichment.phase1(this.zclNode);
            this.log(`[BACKGROUND] ✅ Phase 1 complete: EP=${enrichResult.endpoint}, Protocol=${enrichResult.protocol}`);
          } catch (enrichErr) {
            this.log('[BACKGROUND] ⚠️ Phase 1 enrichment failed (non-critical):', enrichErr.message);
          }
        }
      } else {
        this.log('[BACKGROUND] 🔄 Re-initialization - skip one-time actions');
      }

      // Step 1.5: Apply powerUtils corrections (NEW - based on official docs)
      this.log('[BACKGROUND] Step 1.5/3: Applying battery best practices...');
      await removeBatteryFromACDevices(this);
      await ensureSingleBatteryCapability(this);

      // Step 1.6: CRITICAL - Register ALL capabilities with reporting
      this.log('[BACKGROUND] Step 1.6/3: Registering ALL capabilities with reporting...');

      // ⏳ CRITICAL: Wait for Zigbee stack to be ready
      // Prevents "Zigbee est en cours de démarrage" errors
      // v5.5.824: CRITICAL FIX - Always configure reporting, not just on first init!
      // This was causing "devices not working after update" because reporting was never re-configured
      const needsReportingConfig = this._shouldConfigureReporting();
      
      if (needsReportingConfig) {
        this.log('[BACKGROUND] ⏳ Waiting 2s for Zigbee stack to be ready...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          await this.registerAllCapabilitiesWithReporting();
          this.log('[BACKGROUND] ✅ Capability registration complete');
          
          // v5.5.824: Store app version to detect future updates
          await this.setStoreValue('lastConfiguredVersion', '5.5.824').catch(() => {});
        } catch (regErr) {
          this.error('[BACKGROUND] ❌ Capability registration failed:', regErr.message);
          // v5.5.824: Don't give up - try basic binding at least
          this.log('[BACKGROUND] 🔄 Attempting fallback cluster binding...');
          await this._fallbackClusterBinding().catch(() => {});
        }
      } else {
        this.log('[BACKGROUND] ⏭️  Reporting already configured for this version');
      }

      // Step 2: Configure power capabilities based on detected power
      this.log('[BACKGROUND] Step 2/3: Configuring power capabilities...');
      this.log('   Configuring power-specific capabilities with intelligent detection...');
      // Remove battery from AC/DC devices
      await this.removeBatteryFromACDevices();

      this.log('[OK] Power capabilities configured intelligently');
      this.log('[BACKGROUND] Power capabilities configured');

      // Step 2b: Hardware detection shim (auto-correct capabilities)
      this.log('[BACKGROUND] Step 2b/8: Hardware detection & auto-correction...');
      try {
        const shim = new HardwareDetectionShim(this);
        const corrected = await shim.detectAndCorrect(this.zclNode);
        if (corrected) {
          this.log('[BACKGROUND] ✅ Hardware corrections applied automatically');
        }
      } catch (err) {
        this.error('[BACKGROUND] Hardware shim failed (non-critical):', err);
      }

      // Step 2c: AUTONOMOUS DRIVER ADAPTATION (NEW!)
      // Auto-detects correct driver and adapts capabilities + data routing
      this.log('[BACKGROUND] Step 2c/8: Autonomous driver adaptation...');
      try {
        this.autonomousMigration = new AutonomousMigrationManager(this);
        const adaptResult = await this.autonomousMigration.autoAdapt();
        if (adaptResult.adapted) {
          this.log(`[BACKGROUND] ✅ Driver adapted: ${adaptResult.adaptations.length} changes`);
        } else {
          this.log('[BACKGROUND] ℹ️ No adaptation needed');
        }
      } catch (err) {
        this.error('[BACKGROUND] Autonomous adaptation failed (non-critical):', err.message);
      }

      // Step 2d: CAPABILITY CLEANUP (v5.2.1)
      // Remove wrong capabilities (dim from switches, onoff from sensors, etc.)
      this.log('[BACKGROUND] Step 2d/8: Capability cleanup...');
      try {
        if (needsCleanup(this)) {
          const cleanupResult = await cleanupCapabilities(this);
          if (cleanupResult.removed.length > 0) {
            this.log(`[BACKGROUND] ✅ Removed ${cleanupResult.removed.length} wrong capabilities: ${cleanupResult.removed.join(', ')}`);
          }
        } else {
          this.log('[BACKGROUND] ℹ️ No capability cleanup needed');
        }
      } catch (err) {
        this.error('[BACKGROUND] Capability cleanup failed (non-critical):', err.message);
      }

      // Step 3: CRITICAL - IAS Zone + Multi-Endpoint FIRST
      this.log('[BACKGROUND] Step 3a/4: IAS Zone + Multi-Endpoint setup...');

      // CRITICAL: IAS Zone enrollment (buttons/sensors)
      if (this.zclNode?.endpoints?.[1]?.clusters?.iasZone) {
        this.log('[CRITICAL] 🔒 IAS Zone detected - enrolling...');
        await this.iasZoneManager.enrollIASZone();

        // v5.3.30: Enhanced IAS Zone handler (SDK-compliant)
        if (this.iasZoneEnhanced) {
          await this.iasZoneEnhanced.initialize(this.zclNode).catch(err => {
            this.log('[IAS-ENHANCED] Init error:', err.message);
          });
        }
      }

      // v5.3.30: Smart battery source detection (JohanBendz)
      if (BatteryRouter && this.hasCapability('measure_battery')) {
        try {
          const batteryInfo = await BatteryRouter.resolveBatterySource(this);
          this.log(`[BATTERY-ROUTER] Source: ${batteryInfo.source}, Method: ${batteryInfo.method}`);
          await BatteryRouter.configureBatteryReporting(this, batteryInfo);
        } catch (err) {
          this.log('[BATTERY-ROUTER] Error:', err.message);
        }
      }

      // CRITICAL: Multi-endpoint configuration (switches)
      if (Object.keys(this.zclNode?.endpoints || {}).length > 2) {
        this.log('[CRITICAL] 🔌 Multi-endpoint device detected');
        await this.multiEndpointManager.configureAllEndpoints();
      }

      // Step 3b: DYNAMIC CAPABILITY DISCOVERY (OPTIONAL)
      // DISABLED TEMPORARILY - Causing recognition issues
      /*
      this.log('[BACKGROUND] Step 3b/8: Device migration check...');
      this.migrationManager = new DeviceMigrationManager(this);
      const migrated = await this.migrationManager.checkAndMigrate(this.zclNode);
      if (!migrated) {
        this.log('[BACKGROUND] No migration needed, running dynamic discovery...');
        this.dynamicCapabilityManager = new DynamicCapabilityManager(this);
        await this.dynamicCapabilityManager.inspectAndCreateCapabilities(this.zclNode);
      }
      this.log('[BACKGROUND] Dynamic capabilities ready');
      */
      this.log('[BACKGROUND] Step 3b/8: Dynamic capabilities DISABLED (testing)');

      // Step 4: Initialize Tuya EF00 (if applicable)
      this.log('[BACKGROUND] Step 3c/7: Checking Tuya EF00 support...');

      // 🚨 EMERGENCY FIX for TS0601 sensors not reporting data
      this.log('[BACKGROUND] Step 3c.0/7: Applying TS0601 emergency fix...');
      const emergencyFixApplied = await applyTS0601EmergencyFix(this, this.zclNode);
      if (emergencyFixApplied) {
        this.log('[BACKGROUND] 🚨 TS0601 EMERGENCY FIX APPLIED!');
      }

      const hasTuyaEF00 = await this.tuyaEF00Manager.initialize(this.zclNode);
      if (hasTuyaEF00) {
        this.log('[BACKGROUND] ✅ Tuya EF00 manager initialized');

        // v5.2.11: Initialize DP Data Logger for comprehensive data tracking
        try {
          const TuyaDPDataLogger = require('../tuya/TuyaDPDataLogger');
          this.dpLogger = new TuyaDPDataLogger(this);
          await this.dpLogger.initialize();
          this.log('[BACKGROUND] ✅ Tuya DP Data Logger initialized');

          // Log status after 10 seconds to show what's being received
          setTimeout(() => {
            if (this.dpLogger) {
              this.dpLogger.logStatus();
            }
          }, 10000);
        } catch (loggerErr) {
          this.log('[BACKGROUND] ⚠️ DP Logger failed:', loggerErr.message);
        }
      } else {
        this.log('[BACKGROUND] ✅ Standard Zigbee device (Tuya EF00 not needed)');
      }

      // Step 4b: INTELLIGENT PROTOCOL DETECTION (NEW)
      this.log('[BACKGROUND] Step 3c.1/7: Detecting optimal protocol...');
      try {
        const deviceData = this.getData();
        const manufacturerName = deviceData.manufacturerName || '';
        const protocol = await this.protocolRouter.detectProtocol(this.zclNode, manufacturerName);
        this.log(`[PROTOCOL] ✅ Selected protocol: ${protocol}`);

        // Log diagnostics
        const diagnostics = this.protocolRouter.getDiagnostics();
        this.log('[PROTOCOL] Diagnostics:', JSON.stringify(diagnostics, null, 2));

        // Store for later use
        this.selectedProtocol = protocol;
      } catch (err) {
        this.error('[PROTOCOL] Detection failed:', err);
        this.selectedProtocol = 'ZIGBEE_NATIVE'; // Safe fallback
      }

      // v5.5.929: UNIVERSAL PROTOCOL INIT - ZCL/Tuya/Hybrid detection & setup
      this.log('[BACKGROUND] Step 3c.2/7: Universal protocol initialization...');
      await this._initUniversalProtocol();
      
      // v5.2.82: UNIVERSAL HYBRID MODE - Setup standard clusters for ALL devices
      this.log('[BACKGROUND] Step 3c.3/7: Universal HYBRID mode setup...');
      await this._setupUniversalHybridMode();

      // Step 5: Setup command listeners on ALL endpoints
      this.log('[BACKGROUND] Step 3d/7: Setting up command listeners...');
      try {
        // GUARD: Ensure commandListener exists and handleEndpointCommand is defined
        if (!this.commandListener || typeof this.commandListener.setupListeners !== 'function') {
          this.log('[BACKGROUND] ⚠️  commandListener not available, skipping');
        } else if (!this.handleEndpointCommand || typeof this.handleEndpointCommand !== 'function') {
          this.log('[BACKGROUND] ⚠️  handleEndpointCommand not defined, skipping');
        } else {
          await this.commandListener.setupListeners(this.zclNode, {
            clusters: ['onOff', 'levelControl', 'scenes'],
            onCommand: this.handleEndpointCommand.bind(this)
          });
          this.log('[BACKGROUND] ✅ Command listeners configured');
        }
      } catch (err) {
        this.log('[BACKGROUND] ⚠️  Command listener setup failed:', err.message);
        this.log('[BACKGROUND] Continuing with initialization...');
      }

      // Step 6: Configure battery reporting (NEW v4.9.340 + v4.9.342)
      this.log('[BACKGROUND] Step 3e/7: Configuring battery reporting...');
      if (this.hasCapability('measure_battery')) {
        this.log('[BATTERY-REPORTING] 🔋 Device has measure_battery capability');
        try {
          // NEW v4.9.342: Direct standard Zigbee battery reporting
          setTimeout(async () => {
            await this.configureStandardBatteryReporting();
          }, 3000);

          // Hybrid BatteryReportingManager (v4.9.341)
          setTimeout(async () => {
            await this.batteryReportingManager.initialize(this.zclNode);
          }, 5000);
          this.log('[BATTERY-REPORTING] ✅ Battery reporting scheduled');
        } catch (err) {
          this.error('[BATTERY-REPORTING] Failed to initialize:', err.message);
        }
      }

      // Step 6b: Force read battery value NOW (SIMPLE & DIRECT)
      this.log('[BACKGROUND] Step 3e.1/7: Force initial read + schedule polling...');
      await this.forceInitialRead();
      await this.scheduleAttributePolling();
      this.log('[BACKGROUND] Initial read + polling configured');

      this.log('[BACKGROUND] Step 3f/7: Reading battery value...');
      if (this.powerType === 'BATTERY' && this.hasCapability('measure_battery')) {
        // Use retry logic to handle timing issues
        await this.retryBatteryRead(3);
      }

      // Step 7: Force read temperature/humidity if present
      this.log('[BACKGROUND] Step 3f/7: Reading sensor values...');
      try {
        const endpoint = this.zclNode.endpoints[1];

        // Temperature
        if (this.hasCapability('measure_temperature')) {
          const tempCluster = endpoint?.clusters?.msTemperatureMeasurement;
          if (tempCluster) {
            try {
              const { measuredValue } = await tempCluster.readAttributes(['measuredValue']);
              const temp = measuredValue / 100;
              this.log('[TEMP] ✅ Initial temperature:', temp, '°C');
              await this.setCapabilityValue('measure_temperature', parseFloat(temp));

              // CRITICAL FIX: Register capability listener for future updates!
              this.log('[TEMP] 🔔 Registering temperature listener...');
              await this.registerTemperatureCapability();
            } catch (err) {
              this.log('[TEMP] ⚠️  Temperature read failed:', err.message);
            }
          }
        }

        // Humidity
        if (this.hasCapability('measure_humidity')) {
          const humidCluster = endpoint?.clusters?.msRelativeHumidity;
          if (humidCluster) {
            try {
              const { measuredValue } = await humidCluster.readAttributes(['measuredValue']);
              const humidity = measuredValue / 100;
              this.log('[HUMID] ✅ Initial humidity:', humidity, '%');
              await this.setCapabilityValue('measure_humidity', parseFloat(humidity));

              // CRITICAL FIX: Register capability listener for future updates!
              this.log('[HUMID] 🔔 Registering humidity listener...');
              await this.registerHumidityCapability();
            } catch (err) {
              this.log('[HUMID] ⚠️  Humidity read failed:', err.message);
            }
          }
        }
      } catch (err) {
        this.log('[SENSORS] ⚠️  Sensor read failed:', err.message);
      }

      // Step 3g: CRITICAL - Re-read manufacturer/model for Smart-Adapt
      this.log('[BACKGROUND] Step 3g/7: Re-reading manufacturer/model for Smart-Adapt...');
      if (this.zclNode?.endpoints?.[1]?.clusters?.basic) {
        try {
          const deviceInfo = await this.zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'modelId']);
          if (deviceInfo) {
            if (deviceInfo.manufacturerName) this.zclNode.manufacturerName = deviceInfo.manufacturerName;
            if (deviceInfo.modelId) this.zclNode.modelId = deviceInfo.modelId;
            this.log(`[BACKGROUND] ✅ Manufacturer: ${deviceInfo.manufacturerName || 'Unknown'}`);
            this.log(`[BACKGROUND] ✅ Model: ${deviceInfo.modelId || 'Unknown'}`);
          }
        } catch (err) {
          this.log(`[BACKGROUND] ⚠️  Could not re-read device info: ${err.message}`);
        }
      }

      // Step 3h: INTELLIGENT DEVICE ADAPTER (v5.5.373)
      // Auto-learns capabilities over 15min-1H, removes unused, adds detected
      this.log('[BACKGROUND] Step 3h/8: Initializing Intelligent Device Adapter...');
      try {
        if (IntelligentDeviceAdapter) {
          this.intelligentAdapter = new IntelligentDeviceAdapter(this);
          await this.intelligentAdapter.initialize();
          this.log('[INTELLIGENT] ✅ Device adapter initialized - learning phase started');

          // Also initialize intelligent battery manager
          if (IntelligentBatteryManager && this.hasCapability('measure_battery')) {
            this.intelligentBattery = new IntelligentBatteryManager(this);
            await this.intelligentBattery.initialize();
            this.log('[INTELLIGENT] ✅ Battery manager initialized');
          }

          // Initialize intelligent power manager for plugs/switches
          if (IntelligentPowerManager && (this.hasCapability('measure_power') || this.hasCapability('meter_power'))) {
            this.intelligentPower = new IntelligentPowerManager(this);
            await this.intelligentPower.initialize();
            this.log('[INTELLIGENT] ✅ Power manager initialized');
          }
        } else {
          this.log('[INTELLIGENT] ⚠️ Intelligent adapter not available');
        }
      } catch (err) {
        this.error('[INTELLIGENT] Initialization failed (non-critical):', err.message);
      }

      // Step FINAL: Smart Driver Adaptation & Migration Check
      this.log('[BACKGROUND] Step FINAL: Smart driver adaptation & migration check...');
      try {
        const identificationDatabase = this.homey.app?.identificationDatabase || null;
        const smartAdaptation = new SmartDriverAdaptation(this, identificationDatabase);
        const adaptResult = await smartAdaptation.analyzeAndAdapt();

        if (adaptResult.success && adaptResult.deviceInfo) {
          this.log('[SMART ADAPT] ✅ Analysis complete');

          // Check if migration is needed
          const migrationManager = new DriverMigrationManager(this.homey, identificationDatabase);
          const bestDriver = migrationManager.determineBestDriver(
            adaptResult.deviceInfo,
            adaptResult.clusterAnalysis || {}
          );

          if (bestDriver && bestDriver.driverId !== this.driver.id && bestDriver.confidence > 0.5) {
            this.log('[MIGRATION] ⚠️  Wrong driver detected!');
            this.log(`[MIGRATION] Current: ${this.driver.id}`);
            this.log(`[MIGRATION] Recommended: ${bestDriver.driverId} (confidence: ${bestDriver.confidence})`);
            this.log(`[MIGRATION] Reason: ${bestDriver.reason.join(', ')}`);

            // Notify user via Homey notification
            try {
              await this.homey.notifications.createNotification({
                excerpt: `⚠️ Device "${this.getName()}" needs driver change!\n\nCurrent: ${this.driver.id}\nRecommended: ${bestDriver.driverId}\n\nPlease re-pair with the correct driver for full functionality.`
              });
              this.log('[MIGRATION] ✅ User notified');
            } catch (notifErr) {
              this.log('[MIGRATION] ⚠️  Could not send notification:', notifErr.message);
            }
          } else {
            this.log('[MIGRATION] ✅ Driver is correct');
          }
        }
      } catch (adaptErr) {
        this.log('[SMART ADAPT] ⚠️  Adaptation failed:', adaptErr.message);
      }

      // v5.5.32: Initialize DataRecoveryManager for automatic data recovery
      await this._initDataRecoveryManager();

      // v5.5.33: Initialize HybridDataQuery for TRUE HYBRID (ZCL + Tuya)
      await this._initHybridDataQuery();

      // v5.5.453: Apply SDK3 Best Practices (battery, IAS, capabilities)
      await SDK3BestPractices.applyAllBestPractices(this, this.zclNode, {
        hasIASZone: !!this.zclNode?.endpoints?.[1]?.clusters?.iasZone,
        iasEndpoint: 1
      });

      this._initializationComplete = true;
      this.log('[OK] ✅ Background initialization complete!');
      this.log(`   Final power type: ${this.powerType}`);
      this.log(`   Battery type: ${this.batteryType || 'N/A'}`);

      // v5.5.855: Start periodic auto-enrichment (15min + hourly scans)
      if (typeof this.initPeriodicAutoEnricher === 'function') {
        this.initPeriodicAutoEnricher();
      }

    } catch (err) {
      this.error('[BACKGROUND] Initialization failed:', err.message);
      this.log('[WARN] Device continues with safe defaults');
    }
  }

  /**
   * v5.5.32: Initialize DataRecoveryManager for comprehensive data recovery
   * Applies to ALL device types, not just sensors
   */
  async _initDataRecoveryManager() {
    // Skip if already initialized (child class may have done this)
    if (this._dataRecoveryManager) {
      this.log('[DATA-RECOVERY] Already initialized, skipping');
      return;
    }

    // Skip if DataRecoveryManager not available
    if (!DataRecoveryManager) {
      this.log('[DATA-RECOVERY] Module not available');
      return;
    }

    try {
      this._dataRecoveryManager = new DataRecoveryManager(this, {
        maxRetries: 5,
        verbose: true,
        injectDefaults: false, // Only inject defaults for sensors
      });
      await this._dataRecoveryManager.initialize();
      this.log('[DATA-RECOVERY] ✅ DataRecoveryManager initialized for ALL devices');
    } catch (err) {
      this.log('[DATA-RECOVERY] Init failed:', err.message);
    }
  }

  /**
   * v5.5.33: Initialize HybridDataQuery for BOTH ZCL and Tuya queries
   * Applies to ALL device types
   */
  async _initHybridDataQuery() {
    // Skip if already initialized (child class may have done this)
    if (this._hybridDataQuery) {
      this.log('[HYBRID-QUERY] Already initialized, skipping');
      return;
    }

    // Skip if HybridDataQuery not available
    if (!HybridDataQuery) {
      this.log('[HYBRID-QUERY] Module not available');
      return;
    }

    try {
      this._hybridDataQuery = new HybridDataQuery(this);
      await this._hybridDataQuery.initialize();
      this.log('[HYBRID-QUERY] ✅ HybridDataQuery initialized for ALL devices');
    } catch (err) {
      this.log('[HYBRID-QUERY] Init failed:', err.message);
    }
  }

  /**
   * v5.5.929: Universal Protocol Initialization
   * Detects and initializes ZCL, Tuya DP, or Hybrid protocols
   * Based on Z2M/Hubitat patterns
   */
  async _initUniversalProtocol() {
    try {
      // Detect protocol type
      this._detectedProtocol = detectProtocol(this, this.zclNode);
      this.log(`[UNIVERSAL-INIT] Detected protocol: ${this._detectedProtocol}`);

      // Initialize based on protocol
      switch (this._detectedProtocol) {
        case PROTOCOL.ZCL:
          this.log('[UNIVERSAL-INIT] Initializing ZCL-only mode...');
          await initZCL(this, this.zclNode, this._getZCLClusters());
          break;

        case PROTOCOL.TUYA:
          this.log('[UNIVERSAL-INIT] Initializing Tuya DP mode...');
          await initTuyaDP(this, this.zclNode);
          this._setupTuyaDPHandler();
          break;

        case PROTOCOL.HYBRID:
          this.log('[UNIVERSAL-INIT] Initializing HYBRID mode (ZCL + Tuya)...');
          await initZCL(this, this.zclNode, this._getZCLClusters());
          await initTuyaDP(this, this.zclNode);
          this._setupTuyaDPHandler();
          break;

        default:
          this.log('[UNIVERSAL-INIT] Unknown protocol, trying both...');
          await initZCL(this, this.zclNode, ['onOff']).catch(() => {});
          await initTuyaDP(this, this.zclNode).catch(() => {});
      }

      this.log('[UNIVERSAL-INIT] ✅ Protocol initialization complete');
    } catch (err) {
      this.error('[UNIVERSAL-INIT] Failed:', err.message);
    }
  }

  /**
   * Get ZCL clusters to initialize based on device capabilities
   */
  _getZCLClusters() {
    const clusters = [];
    if (this.hasCapability('onoff')) clusters.push('onOff');
    if (this.hasCapability('dim')) clusters.push('levelControl');
    if (this.hasCapability('light_hue') || this.hasCapability('light_saturation')) clusters.push('colorControl');
    if (this.hasCapability('measure_temperature')) clusters.push('msTemperatureMeasurement');
    if (this.hasCapability('measure_humidity')) clusters.push('msRelativeHumidity');
    if (this.hasCapability('measure_battery')) clusters.push('genPowerCfg');
    if (this.hasCapability('windowcoverings_set')) clusters.push('closuresWindowCovering');
    return clusters.length > 0 ? clusters : ['onOff'];
  }

  /**
   * Setup Tuya DP data handler
   */
  _setupTuyaDPHandler() {
    // Define handleTuyaDP if not already defined by child class
    if (!this.handleTuyaDP) {
      this.handleTuyaDP = async (data) => {
        this.log('[TUYA-DP] Received:', JSON.stringify(data));
        
        // Let child classes or managers handle the data
        if (this.tuyaEF00Manager?.handleDP) {
          await this.tuyaEF00Manager.handleDP(data);
        }
        
        // Also emit event for flexibility
        this.emit('tuya.dp', data);
      };
    }
  }

  /**
   * v5.5.929: Send Tuya DP command (universal helper)
   * @param {number} dp - Data Point ID
   * @param {any} value - Value to send
   * @param {string} type - Data type: 'bool', 'value', 'enum', 'string'
   */
  async sendTuyaCommand(dp, value, type = 'bool') {
    return sendTuyaDP(this, dp, value, type);
  }

  /**
   * Detect power source from device
   * Reads powerSource attribute from Basic cluster
   * SDK3 Method: Uses numeric cluster IDs
   * Enhanced: Checks manual override settings first
   */
  async detectPowerSource() {
    this.log('[SEARCH] Detecting power source...');
    this.log('  Expected: Cluster POWER_CONFIGURATION (ID: 1) or attribute powerSource');

    // Check for manual override in settings
    const manualPowerSource = this.getSetting('power_source');
    if (manualPowerSource && manualPowerSource !== 'auto') {
      this.log(`[TARGET] Manual power source override: ${manualPowerSource}`);
      this.powerType = manualPowerSource.toUpperCase();

      if (this.powerType === 'BATTERY') {
        await this.detectBatteryType();
      }

      await this.setStoreValue('power_type', this.powerType);
      await this.setStoreValue('battery_type', this.batteryType);
      return;
    }

    try {
      // Try to read powerSource attribute (Basic cluster 0x0000, attribute 0x0007)
      // CRITICAL FIX: Add timeout to prevent infinite hang + null checks
      if (!this.zclNode || !this.zclNode.endpoints || !this.zclNode.endpoints[1]) {
        this.log('[SEARCH] ⚠️ zclNode or endpoints not available, using defaults');
        this.powerType = 'AC';
        this.batteryType = null;
        await this.setStoreValue('power_type', this.powerType);
        await this.setStoreValue('battery_type', this.batteryType);
        return;
      }

      const basicCluster = this.zclNode.endpoints[1].clusters?.basic;

      if (basicCluster && typeof basicCluster.readAttributes === 'function') {
        this.log('[SEARCH] Reading powerSource attribute (5s timeout)...');
        const attributes = await ZigbeeTimeout.readAttributes(basicCluster, ['powerSource'], 5000).catch(err => {
          this.log('[SEARCH] ⚠️ Failed to read powerSource:', err.message);
          return null;
        });

        if (attributes?.powerSource !== undefined) {
          const powerSource = attributes; // Already read above with timeout
          this.log('📡 PowerSource attribute read:');
          this.log(`  - Raw value: ${JSON.stringify(powerSource)}`);
          this.log(`  - powerSource: ${powerSource.powerSource}`);
          this.log(`  - Type: ${typeof powerSource.powerSource}`);
          this.log(`  - Is battery string: ${powerSource.powerSource === 'battery'}`);
          this.log(`  - Is battery numeric: ${powerSource.powerSource === 3}`);

          // Handle both numeric AND string values (different Zigbee implementations)
          // Numeric: 0x00=Unknown, 0x01=Mains, 0x02=Mains 3-phase, 0x03=Battery, 0x04=DC
          // String: "unknown", "mains", "battery", "dc"

          const powerSourceStr = typeof powerSource === 'string' ? powerSource.toLowerCase() : null;

          if (powerSource.powerSource === 'battery' || powerSource.powerSource === 3) {
            this.powerType = 'BATTERY';
            this.log('[OK] Detected: Battery Power');
            await this.detectBatteryType();

          } else if (powerSource.powerSource === 0x01 || powerSource.powerSource === 0x02 || powerSource.powerSource === 0x05 || powerSource.powerSource === 0x06 ||
            powerSourceStr === 'mains' || powerSourceStr === 'ac') {
            this.powerType = 'AC';
            this.log('[OK] Detected: AC Mains Power');

          } else if (powerSource.powerSource === 0x04 || powerSourceStr === 'dc') {
            this.powerType = 'DC';
            this.log('[OK] Detected: DC Power');

          } else {
            this.log('[WARN]  Unknown power source value, using fallback detection');
            await this.fallbackPowerDetection();
          }

          // Store power type for future reference
          await this.setStoreValue('power_type', this.powerType);
          await this.setStoreValue('battery_type', this.batteryType);

        } else {
          this.log('[WARN]  PowerSource attribute not available, using fallback');
          await this.fallbackPowerDetection();
        }
      } else {
        this.log('[WARN]  Basic cluster not available, using fallback');
        await this.fallbackPowerDetection();
      }

    } catch (err) {
      this.log('[WARN]  Could not read powerSource:', err.message);
      this.log(`  Error details: ${err.stack || err}`);
      this.log('[INFO] Falling back to cluster detection...');
      this.log('  Checking for presence of powerConfiguration cluster...');

      // Fallback: Check for battery cluster presence
      const endpoint1 = this.zclNode.endpoints[1];
      this.log('  Endpoint 1 clusters:', Object.keys(endpoint1?.clusters || {}).join(', '));

      const hasBatteryCluster = endpoint1?.clusters?.powerConfiguration || endpoint1?.clusters?.genPowerCfg;
      this.log(`  - Has powerConfiguration: ${!!endpoint1?.clusters?.powerConfiguration}`);
      this.log(`  - Has genPowerCfg: ${!!endpoint1?.clusters?.genPowerCfg}`);
      this.log(`  - Has tuyaManufacturer: ${!!endpoint1?.clusters?.tuyaManufacturer}`);
      this.log(`  - Battery cluster found: ${!!hasBatteryCluster}`);

      if (hasBatteryCluster) {
        await this.fallbackPowerDetection();
      } else {
        this.log('[TUYA] ❌ No Tuya cluster found');
        this.log('[TUYA] 📋 Available clusters:', Object.keys(endpoint1?.clusters || {}).join(', '));
        this.log('[TUYA] ℹ️  If this is a Tuya device, check cluster names above');
        await this.fallbackPowerDetection();
      }
    }
  }

  /**
   * Fallback power detection using driver configuration
   * Checks energy.batteries array and capabilities
   * CRITICAL: Checks manual override settings FIRST
   */
  async fallbackPowerDetection() {
    this.log('[SYNC] Using fallback power detection...');

    // CRITICAL FIX: Check manual override FIRST (before any fallback logic)
    const manualPowerSource = this.getSetting('power_source');
    if (manualPowerSource && manualPowerSource !== 'auto') {
      this.log(`[OVERRIDE] ⚡ Manual power source: ${manualPowerSource}`);
      this.powerType = manualPowerSource.toUpperCase();

      if (this.powerType === 'BATTERY') {
        const manualBatteryType = this.getSetting('battery_type');
        if (manualBatteryType && manualBatteryType !== 'auto') {
          this.batteryType = manualBatteryType;
          this.log(`[OVERRIDE] 🔋 Manual battery type: ${this.batteryType}`);
        } else {
          await this.detectBatteryType();
        }
      }

      await this.setStoreValue('power_type', this.powerType);
      await this.setStoreValue('battery_type', this.batteryType);
      return; // STOP HERE - manual override takes precedence over all auto-detection
    }

    // Only use automatic detection if NO manual override
    const driverManifest = this.driver.manifest;

    if (driverManifest.energy?.batteries) {
      this.powerType = 'BATTERY';
      const batteries = driverManifest.energy.batteries;
      this.batteryType = batteries[0]; // Use first battery type as default
      this.log(`[OK] Fallback: Battery (${this.batteryType})`);

    } else if (driverManifest.capabilities?.includes('measure_power')) {
      this.powerType = 'AC';
      this.log('[OK] Fallback: AC Mains');

    } else if (driverManifest.capabilities?.includes('measure_voltage')) {
      this.powerType = 'DC';
      this.log('[OK] Fallback: DC Power');

    } else {
      // Default to battery for safety (won't try to read AC attributes)
      this.powerType = 'BATTERY';
      this.batteryType = 'CR2032';
      this.log('[WARN]  Fallback: Assuming Battery (CR2032)');
    }
  }

  /**
   * Detect battery type from voltage
   * Different batteries have different voltage ranges
   * Enhanced: Checks manual override first
   */
  async detectBatteryType() {
    this.log('[BATTERY] Detecting battery type from voltage...');

    // Check for manual override in settings
    const manualBatteryType = this.getSetting('battery_type');
    if (manualBatteryType && manualBatteryType !== 'auto') {
      this.log(`[TARGET] Manual battery type override: ${manualBatteryType}`);
      this.batteryType = manualBatteryType;
      return;
    }

    try {
      const powerCluster = this.zclNode.endpoints[1]?.clusters?.powerConfiguration;

      if (powerCluster) {
        this.log('[BATTERY] Reading battery voltage (5s timeout)...');
        const batteryVoltage = await ZigbeeTimeout.readAttributes(powerCluster, ['batteryVoltage'], 5000);

        if (batteryVoltage?.batteryVoltage) {
          const voltage = batteryVoltage.batteryVoltage / 10; // Convert to V
          this.log('[DATA] Battery voltage:', voltage, 'V');

          // Store voltage for display and health monitoring
          await this.setStoreValue('battery_voltage', voltage);

          // Use intelligent battery type detection
          this.batteryType = BatteryManager.detectBatteryTypeFromVoltage(voltage);
          this.log(`[OK] Intelligent detection: ${this.batteryType} (voltage: ${voltage}V)`);

          // Get battery health assessment
          const rawPercentage = this.hasCapability('measure_battery')
            ? this.getCapabilityValue('measure_battery')
            : null;
          if (rawPercentage !== null && typeof rawPercentage === 'number') {
            const health = BatteryManager.getBatteryHealth(rawPercentage, voltage, this.batteryType);
            this.log(`🏥 Battery health: ${health.status} - ${health.recommendation}`);
            await this.setStoreValue('battery_health', health);
          }
        } else {
          // Use driver config
          const batteries = this.driver.manifest.energy?.batteries || ['CR2032'];
          this.batteryType = batteries[0];
          this.log(`[WARN]  Voltage not available, using config: ${this.batteryType}`);
        }
      }
    } catch (err) {
      this.error('Battery type detection failed:', err.message);
      this.batteryType = 'CR2032'; // Safe default
    }
  }

  /**
   * Configure capabilities based on detected power type
   * Dynamically add/remove capabilities
   * SDK3 Compliant: NO alarm_battery
   */
  async configurePowerCapabilities() {
    this.log('⚙️  Configuring power-specific capabilities with intelligent detection...');

    try {
      if (this.powerType === 'AC' || this.powerType === 'DC') {
        // Detect available power measurement capabilities
        const available = await PowerManager.detectPowerCapabilities(this.zclNode);
        this.log('[DATA] Power capabilities detected:', available);

        // Store for later use
        await this.setStoreValue('power_capabilities', available);

        // Get recommended capabilities
        const recommended = PowerManager.getRecommendedCapabilities(available, this.powerType);
        this.log('[OK] Recommended capabilities:', recommended);

        // Add available capabilities
        for (const capability of recommended) {
          if (!this.hasCapability(capability)) {
            await Promise.resolve(addCapability(capability)).catch(err => {
              this.log(`Failed to add ${capability}:`, err.message);
            });
            this.log(`[OK] Added ${capability}`);
          }
        }

        // Remove capabilities that should be hidden (no data and can't estimate)
        const canEstimate = this.getSetting('enable_power_estimation') !== false;

        // Check each power capability
        for (const capability of ['measure_voltage', 'measure_current', 'measure_power', 'meter_power']) {
          if (this.hasCapability(capability)) {
            const shouldHide = PowerManager.shouldHideCapability(capability, available, canEstimate);

            if (shouldHide) {
              await Promise.resolve(removeCapability(capability)).catch(() => { });
              this.log(`[LOCK] Hidden ${capability} (no data available)`);
            }
          }
        }

        // Remove battery if present (shouldn't be for AC/DC)
        if (this.hasCapability('measure_battery')) {
          await Promise.resolve(removeCapability('measure_battery')).catch(() => { });
          this.log('🗑️  Removed measure_battery (AC/DC device)');
        }

      } else if (this.powerType === 'BATTERY') {
        // Battery: Ensure measure_battery is present
        if (!this.hasCapability('measure_battery')) {
          await Promise.resolve(addCapability('measure_battery')).catch(() => { });
          this.log('[OK] Added measure_battery capability');
        }

        // Remove AC/DC capabilities if present
        for (const capability of ['measure_power', 'meter_power', 'measure_voltage', 'measure_current']) {
          if (this.hasCapability(capability)) {
            await Promise.resolve(removeCapability(capability)).catch(() => { });
            this.log(`🗑️  Removed ${capability} (battery device)`);
          }
        }
      }

      this.log('[OK] Power capabilities configured intelligently');

    } catch (err) {
      this.error('Capability configuration failed:', err.message);
    }
  }

  /**
   * Setup monitoring based on power type
   * SDK3 Compliant battery monitoring
   * ENHANCED: Also configures real-time reporting for all sensor data
   */
  async setupMonitoring() {
    this.log('[DATA] Setting up power monitoring...');

    if (this.powerType === 'BATTERY') {
      await this.setupBatteryMonitoring();
    } else if (this.powerType === 'AC') {
      await this.setupACMonitoring();
    } else if (this.powerType === 'DC') {
      await this.setupDCMonitoring();
    }

    // CRITICAL FIX: Setup real-time reporting for ALL data types
    await this.setupRealtimeReporting();
  }

  /**
   * Setup real-time reporting for all sensor data
   * Configures Zigbee attribute reporting so data updates immediately
   * User can control intervals via settings
   */
  async setupRealtimeReporting() {
    this.log('[REALTIME] \ud83d\udcca Setting up real-time data reporting...');

    try {
      // Check if real-time reporting is enabled
      const enableRealtime = this.getSetting('enable_realtime_reporting');
      if (enableRealtime === false) {
        this.log('[INFO] Real-time reporting disabled by user');
        return;
      }

      // Get reporting intervals from settings (user configurable!)
      const reportInterval = this.getSetting('report_interval') || 60; // seconds
      const minInterval = Math.max(1, Math.floor(reportInterval / 2));
      const maxInterval = reportInterval * 2;

      this.log(`[CONFIG] Report intervals: min=${minInterval}s, max=${maxInterval}s`);

      const endpoint = this.zclNode.endpoints[1];
      if (!endpoint) {
        this.log('[WARN] No endpoint 1, skipping reporting setup');
        return;
      }

      // Configure reporting for each data type
      let configured = 0;
      configured += await this._setupTemperatureReporting(endpoint, minInterval, maxInterval) ? 1 : 0;
      configured += await this._setupHumidityReporting(endpoint, minInterval, maxInterval) ? 1 : 0;
      configured += await this._setupOccupancyReporting(endpoint, minInterval, maxInterval) ? 1 : 0;
      configured += await this._setupIlluminanceReporting(endpoint, minInterval, maxInterval) ? 1 : 0;
      configured += await this._setupOnOffReporting(endpoint, minInterval, maxInterval) ? 1 : 0;
      configured += await this._setupContactReporting(endpoint, minInterval, maxInterval) ? 1 : 0;

      this.log(`[OK] \u2705 Real-time reporting configured (${configured} data types)`);

    } catch (err) {
      this.error('[ERROR] Real-time reporting setup failed:', err.message);
    }
  }

  /**
   * Setup temperature reporting (temps réel!)
   */
  async _setupTemperatureReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('measure_temperature')) return false;

    const cluster = endpoint.clusters?.temperatureMeasurement || endpoint.clusters?.msTemperatureMeasurement;
    if (!cluster) return false;

    try {
      await cluster.configureReporting({
        measuredValue: {
          minInterval,
          maxInterval,
          minChange: 10 // 0.1°C
        }
      });
      this.log('[OK] \ud83c\udf21\ufe0f Temperature reporting configured');
      return true;
    } catch (err) {
      this.log('[WARN] Temperature reporting failed (non-critical):', err.message);
      return false;
    }
  }

  /**
   * Setup humidity reporting (temps réel!)
   */
  async _setupHumidityReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('measure_humidity')) return false;

    const cluster = endpoint.clusters?.relativeHumidity || endpoint.clusters?.msRelativeHumidity;
    if (!cluster) return false;

    try {
      await cluster.configureReporting({
        measuredValue: {
          minInterval,
          maxInterval,
          minChange: 100 // 1%
        }
      });
      this.log('[OK] \ud83d\udca7 Humidity reporting configured');
      return true;
    } catch (err) {
      this.log('[WARN] Humidity reporting failed (non-critical):', err.message);
      return false;
    }
  }

  /**
   * Setup occupancy (motion) reporting (temps réel!)
   */
  async _setupOccupancyReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('alarm_motion')) return false;

    const cluster = endpoint.clusters?.occupancySensing || endpoint.clusters?.msOccupancySensing;
    if (!cluster) return false;

    try {
      await cluster.configureReporting({
        occupancy: {
          minInterval: 1, // IMMEDIATE for motion!
          maxInterval: 300, // 5 min max
          minChange: 1
        }
      });
      this.log('[OK] \ud83d\udeb6 Motion reporting configured (immediate)');
      return true;
    } catch (err) {
      this.log('[WARN] Motion reporting failed (non-critical):', err.message);
      return false;
    }
  }

  /**
   * Setup illuminance reporting (temps réel!)
   */
  async _setupIlluminanceReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('measure_luminance')) return false;

    const cluster = endpoint.clusters?.illuminanceMeasurement || endpoint.clusters?.msIlluminanceMeasurement;
    if (!cluster) return false;

    try {
      await cluster.configureReporting({
        measuredValue: {
          minInterval,
          maxInterval,
          minChange: 500 // ~5 lux
        }
      });
      this.log('[OK] \ud83d\udca1 Luminance reporting configured');
      return true;
    } catch (err) {
      this.log('[WARN] Luminance reporting failed (non-critical):', err.message);
      return false;
    }
  }

  /**
   * Setup on/off reporting (temps réel!)
   */
  async _setupOnOffReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('onoff')) return false;

    const cluster = endpoint.clusters?.onOff;
    if (!cluster) return false;

    try {
      await cluster.configureReporting({
        onOff: {
          minInterval: 0, // IMMEDIATE!
          maxInterval: 300,
          minChange: 1
        }
      });
      this.log('[OK] \u26a1 OnOff reporting configured (immediate)');
      return true;
    } catch (err) {
      this.log('[WARN] OnOff reporting failed (non-critical):', err.message);
      return false;
    }
  }

  /**
   * Setup contact sensor reporting (temps réel!)
   */
  async _setupContactReporting(endpoint, minInterval, maxInterval) {
    if (!this.hasCapability('alarm_contact')) return false;

    // Contact sensors typically use IAS Zone cluster
    const iasZone = endpoint.clusters?.iasZone;
    if (iasZone) {
      this.log('[INFO] Contact uses IAS Zone (events, not reporting)');
      return false; // IAS Zone uses events, not attribute reporting
    }

    // Alternative: onOff cluster for some contacts
    const cluster = endpoint.clusters?.onOff;
    if (!cluster) return false;

    try {
      await cluster.configureReporting({
        onOff: {
          minInterval: 0, // IMMEDIATE!
          maxInterval: 300,
          minChange: 1
        }
      });
      this.log('[OK] \ud83d\udeaa Contact reporting configured (immediate)');
      return true;
    } catch (err) {
      this.log('[WARN] Contact reporting failed (non-critical):', err.message);
      return false;
    }
  }

  /**
   * Setup battery monitoring (SDK3 compliant)
   * Direct cluster listeners instead of registerCapability
   * Enhanced: Supports Tuya custom clusters
   */
  async setupBatteryMonitoring() {
    this.log('[BATTERY] Setting up battery monitoring...');

    // Try multiple methods for Tuya device compatibility
    if (await this.setupStandardBatteryMonitoring()) {
      this.log('[OK] Standard battery monitoring configured');
      return;
    }

    if (await this.setupTuyaBatteryMonitoring()) {
      this.log('[OK] Tuya battery monitoring configured');
      return;
    }

    if (await this.setupAlternativeEndpointBattery()) {
      this.log('[OK] Alternative endpoint battery configured');
      return;
    }

    this.log('[WARN]  No battery monitoring available (device may not support it)');
  }

  /**
   * Setup standard battery monitoring (SDK3 compliant)
   */
  async setupStandardBatteryMonitoring() {
    // v5.5.34: Skip for devices using Tuya DP battery
    if (this.skipZclBatteryPolling || this.usesTuyaDPBattery) {
      this.log('[BATTERY] Skipping standard battery monitoring (using Tuya DP)');
      return false;
    }

    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint?.clusters?.powerConfiguration) {
        return false;
      }

      // Read initial battery value IMMEDIATELY
      try {
        const batteryData = await endpoint.clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']).catch(err => {
          this.log('[WARN] Could not read initial battery:', err.message);
          return null;
        });
        if (batteryData) {
          const batteryPercent = batteryData.batteryPercentageRemaining;
          if (this.hasCapability('measure_battery')) {
            await Promise.resolve(this.setCapabilityValue('measure_battery', parseFloat(batteryPercent))).catch(this.error);
            this.log(`[BATTERY] Initial battery: ${batteryPercent}%`);
          }
        }
      } catch (err) {
        this.log('[WARN] Failed to read initial battery:', err.message);
      }

      await endpoint.clusters.powerConfiguration.configureReporting({
        batteryPercentageRemaining: {
          minInterval: 300,
          maxInterval: 3600,
          minChange: 2
        }
      });
      this.log('[OK] Battery reporting configured');
      return true;
    } catch (err) {
      this.log('[WARN] Battery reporting failed (non-critical):', err.message);
      return false;
    }
  }

  /**
   * Force read ALL initial values (KPIs)
   */
  async _forceReadAllInitialValues() {
    this.log('[KPI] Force reading all initial KPI values...');

    if (!this.zclNode?.endpoints?.[1]) {
      this.log('[WARN] No endpoint 1 available for initial value read');
      return;
    }

    const endpoint = this.zclNode.endpoints[1];
    let readCount = 0;

    // Temperature
    if (this.hasCapability('measure_temperature')) {
      try {
        const tempCluster = endpoint.clusters?.temperatureMeasurement || endpoint.clusters?.msTemperatureMeasurement;
        if (tempCluster) {
          const temp = await tempCluster.readAttributes(['measuredValue']).catch(() => null);
          if (temp?.measuredValue !== undefined) {
            const tempC = temp.measuredValue / 100;
            await Promise.resolve(this.setCapabilityValue('measure_temperature', parseFloat(tempC))).catch(this.error);
            this.log(`[KPI] 🌡️ Temperature: ${tempC}°C`);
            readCount++;
          }
        }
      } catch (err) {
        this.log('[WARN] Failed to read temperature:', err.message);
      }
    }

    // Humidity
    if (this.hasCapability('measure_humidity')) {
      try {
        const humCluster = endpoint.clusters?.relativeHumidity || endpoint.clusters?.msRelativeHumidity;
        if (humCluster) {
          const hum = await humCluster.readAttributes(['measuredValue']).catch(() => null);
          if (hum?.measuredValue !== undefined) {
            const humPercent = hum.measuredValue / 100;
            await Promise.resolve(this.setCapabilityValue('measure_humidity', parseFloat(humPercent))).catch(this.error);
            this.log(`[KPI] 💧 Humidity: ${humPercent}%`);
            readCount++;
          }
        }
      } catch (err) {
        this.log('[WARN] Failed to read humidity:', err.message);
      }
    }

    // Illuminance
    if (this.hasCapability('measure_luminance')) {
      try {
        const illumCluster = endpoint.clusters?.illuminanceMeasurement || endpoint.clusters?.msIlluminanceMeasurement;
        if (illumCluster) {
          const illum = await illumCluster.readAttributes(['measuredValue']).catch(() => null);
          if (illum?.measuredValue !== undefined) {
            const lux = Math.pow(10, (illum.measuredValue - 1) / 10000);
            await Promise.resolve(this.setCapabilityValue('measure_luminance', parseFloat(lux))).catch(this.error);
            this.log(`[KPI] 💡 Illuminance: ${lux} lux`);
            readCount++;
          }
        }
      } catch (err) {
        this.log('[WARN] Failed to read illuminance:', err.message);
      }
    }

    // Power (AC devices)
    if (this.hasCapability('measure_power')) {
      try {
        const powerCluster = endpoint.clusters?.electricalMeasurement || endpoint.clusters?.haElectricalMeasurement;
        if (powerCluster) {
          const power = await powerCluster.readAttributes(['activePower']).catch(() => null);
          if (power?.activePower !== undefined) {
            const watts = power.activePower;
            await Promise.resolve(setCapabilityValue('measure_power', parseFloat(watts))).catch(this.error);
            this.log(`[KPI] ⚡ Power: ${watts}W`);
            readCount++;
          }
        }
      } catch (err) {
        this.log('[WARN] Failed to read power:', err.message);
      }
    }

    // Voltage
    if (this.hasCapability('measure_voltage')) {
      try {
        const powerCluster = endpoint.clusters?.electricalMeasurement || endpoint.clusters?.haElectricalMeasurement;
        if (powerCluster) {
          const voltage = await powerCluster.readAttributes(['rmsVoltage']).catch(() => null);
          if (voltage?.rmsVoltage !== undefined) {
            const volts = voltage.rmsVoltage;
            await Promise.resolve(setCapabilityValue('measure_voltage', parseFloat(volts))).catch(this.error);
            this.log(`[KPI] 🔌 Voltage: ${volts}V`);
            readCount++;
          }
        }
      } catch (err) {
        this.log('[WARN] Failed to read voltage:', err.message);
      }
    }

    // Current
    if (this.hasCapability('measure_current')) {
      try {
        const powerCluster = endpoint.clusters?.electricalMeasurement || endpoint.clusters?.haElectricalMeasurement;
        if (powerCluster) {
          const current = await powerCluster.readAttributes(['rmsCurrent']).catch(() => null);
          if (current?.rmsCurrent !== undefined) {
            const amps = current.rmsCurrent / 1000; // mA to A
            await Promise.resolve(setCapabilityValue('measure_current', parseFloat(amps))).catch(this.error);
            this.log(`[KPI] ⚡ Current: ${amps}A`);
            readCount++;
          }
        }
      } catch (err) {
        this.log('[WARN] Failed to read current:', err.message);
      }
    }

    // OnOff state
    if (this.hasCapability('onoff')) {
      try {
        const onOffCluster = endpoint.clusters?.onOff;
        if (onOffCluster) {
          const state = await onOffCluster.readAttributes(['onOff']).catch(() => null);
          if (state?.onOff !== undefined) {
            await Promise.resolve(setCapabilityValue('onoff', state.onOff)).catch(this.error);
            this.log(`[KPI] 💡 OnOff: ${state.onOff ? 'ON' : 'OFF'}`);
            readCount++;
          }
        }
      } catch (err) {
        this.log('[WARN] Failed to read onoff:', err.message);
      }
    }

    // Occupancy (Motion sensors)
    if (this.hasCapability('alarm_motion')) {
      try {
        const occCluster = endpoint.clusters?.occupancySensing || endpoint.clusters?.msOccupancySensing;
        if (occCluster) {
          const occ = await occCluster.readAttributes(['occupancy']).catch(() => null);
          if (occ?.occupancy !== undefined) {
            const occupied = (occ.occupancy & 1) === 1;
            await Promise.resolve(setCapabilityValue('alarm_motion', occupied)).catch(this.error);
            this.log(`[KPI] 🚶 Motion: ${occupied ? 'DETECTED' : 'CLEAR'}`);
            readCount++;
          }
        }
      } catch (err) {
        this.log('[WARN] Failed to read occupancy:', err.message);
      }
    }

    // Contact (Door sensors)
    if (this.hasCapability('alarm_contact')) {
      try {
        const iasCluster = endpoint.clusters?.iasZone;
        if (iasCluster) {
          const zone = await iasCluster.readAttributes(['zoneStatus']).catch(() => null);
          if (zone?.zoneStatus !== undefined) {
            const open = (zone.zoneStatus & 1) === 1;
            await Promise.resolve(setCapabilityValue('alarm_contact', open)).catch(this.error);
            this.log(`[KPI] 🚪 Contact: ${open ? 'OPEN' : 'CLOSED'}`);
            readCount++;
          }
        }
      } catch (err) {
        this.log('[WARN] Failed to read contact:', err.message);
      }
    }

    this.log(`[OK] ✅ Read ${readCount} initial KPI values`);
  }

  /**
   * LEGACY SUPPORT: registerBatteryCapability (v4.1.x compatibility)
   * Uses registerCapability() with getOnStart: true (AUTO reads initial value!)
   */
  async registerBatteryCapability(options = {}) {
    const {
      cluster = 'powerConfiguration',
      attribute = 'batteryPercentageRemaining',
      minInterval = 300,
      maxInterval = 3600,
      minChange = 2
    } = options;

    try {
      await this.registerCapability('measure_battery', cluster, {
        get: attribute,
        report: attribute,
        reportOpts: {
          configureAttributeReporting: {
            minInterval,
            maxInterval,
            minChange
          }
        },
        getOpts: {
          getOnStart: true,  // ✅ AUTO READ at start!
          getOnOnline: true   // ✅ AUTO READ when online!
        },
        reportParser: value => {
          return Math.round(value / 2); // Zigbee reports 0-200, we want 0-100
        }
      });

      this.log('[LEGACY] Battery capability registered successfully (v4.1.x style)');
    } catch (err) {
      this.error('Error registering battery capability:', err);
    }
  }

  /**
   * SDK3: Register temperature capability with direct cluster access
   */
  async registerTemperatureCapability() {
    // v5.3.61: Guard against multiple registrations
    if (this._tempCapabilityRegistered) {
      this.log('[TEMP] ⚠️ Already registered, skipping');
      return;
    }
    this._tempCapabilityRegistered = true;

    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      const tempCluster = endpoint?.clusters?.msTemperatureMeasurement;

      if (!tempCluster) {
        this.log('[TEMP] ⚠️  Temperature cluster not available');
        return;
      }

      // v5.3.61: Increase max listeners to prevent warnings
      if (typeof tempCluster.setMaxListeners === 'function') {
        tempCluster.setMaxListeners(50);
      }

      // v5.3.61: Ensure capability exists before adding listener
      if (!this.hasCapability('measure_temperature')) {
        try {
          await this.addCapability('measure_temperature');
          this.log('[TEMP] ➕ Added measure_temperature capability');
        } catch (err) {
          this.log('[TEMP] ⚠️ Could not add capability:', err.message);
        }
      }

      // SDK3: Direct cluster listener
      tempCluster.on('attr.measuredValue', async (value) => {
        const temp = value / 100;
        this.log(`[TEMP] 🌡️ Temperature: ${temp}°C`);
        if (this.hasCapability('measure_temperature')) {
          await this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(this.error);
        }
      });

      // Configure reporting
      try {
        await tempCluster.configureReporting({
          measuredValue: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 50  // 0.5°C
          }
        });
        this.log('[TEMP] ✅ Reporting configured');
      } catch (err) {
        this.log('[TEMP] ⚠️  Reporting config failed:', err.message);
      }

      // Read initial value
      try {
        const { measuredValue } = await tempCluster.readAttributes(['measuredValue']);
        const temp = measuredValue / 100;
        this.log(`[TEMP] 📊 Initial: ${temp}°C`);
        if (this.hasCapability('measure_temperature')) {
          await this.setCapabilityValue('measure_temperature', parseFloat(temp));
        }
      } catch (err) {
        this.log('[TEMP] ⚠️  Initial read failed:', err.message);
      }

      this.log('[TEMP] ✅ Temperature capability registered (SDK3)');
    } catch (err) {
      this.error('[TEMP] ❌ Registration failed:', err);
    }
  }

  /**
   * SDK3: Register humidity capability with direct cluster access
   */
  async registerHumidityCapability() {
    // v5.3.61: Guard against multiple registrations
    if (this._humidCapabilityRegistered) {
      this.log('[HUMID] ⚠️ Already registered, skipping');
      return;
    }
    this._humidCapabilityRegistered = true;

    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      const humidCluster = endpoint?.clusters?.msRelativeHumidity;

      if (!humidCluster) {
        this.log('[HUMID] ⚠️  Humidity cluster not available');
        return;
      }

      // v5.3.61: Increase max listeners to prevent warnings
      if (typeof humidCluster.setMaxListeners === 'function') {
        humidCluster.setMaxListeners(50);
      }

      // v5.3.61: Ensure capability exists before adding listener
      if (!this.hasCapability('measure_humidity')) {
        try {
          await this.addCapability('measure_humidity');
          this.log('[HUMID] ➕ Added measure_humidity capability');
        } catch (err) {
          this.log('[HUMID] ⚠️ Could not add capability:', err.message);
        }
      }

      // SDK3: Direct cluster listener
      humidCluster.on('attr.measuredValue', async (value) => {
        const humidity = value / 100;
        this.log(`[HUMID] 💧 Humidity: ${humidity}%`);
        if (this.hasCapability('measure_humidity')) {
          await this.setCapabilityValue('measure_humidity', parseFloat(humidity)).catch(this.error);
        }
      });

      // Configure reporting
      try {
        await humidCluster.configureReporting({
          measuredValue: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 100  // 1%
          }
        });
        this.log('[HUMID] ✅ Reporting configured');
      } catch (err) {
        this.log('[HUMID] ⚠️  Reporting config failed:', err.message);
      }

      // Read initial value
      try {
        const { measuredValue } = await humidCluster.readAttributes(['measuredValue']);
        const humidity = measuredValue / 100;
        this.log(`[HUMID] 📊 Initial: ${humidity}%`);
        if (this.hasCapability('measure_humidity')) {
          await this.setCapabilityValue('measure_humidity', parseFloat(humidity));
        }
      } catch (err) {
        this.log('[HUMID] ⚠️  Initial read failed:', err.message);
      }

      this.log('[HUMID] ✅ Humidity capability registered (SDK3)');
    } catch (err) {
      this.error('[HUMID] ❌ Registration failed:', err);
    }
  }

  /**
   * SDK3: Register luminance capability with direct cluster access
   */
  async registerLuminanceCapability() {
    // v5.3.61: Guard against multiple registrations
    if (this._luxCapabilityRegistered) {
      this.log('[LUX] ⚠️ Already registered, skipping');
      return;
    }
    this._luxCapabilityRegistered = true;

    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      const luxCluster = endpoint?.clusters?.msIlluminanceMeasurement;

      if (!luxCluster) {
        this.log('[LUX] ⚠️  Illuminance cluster not available');
        return;
      }

      // v5.3.61: Increase max listeners to prevent warnings
      if (typeof luxCluster.setMaxListeners === 'function') {
        luxCluster.setMaxListeners(50);
      }

      // SDK3: Direct cluster listener
      luxCluster.on('attr.measuredValue', async (value) => {
        const lux = Math.pow(10, (value - 1) / 10000);
        this.log(`[LUX] 💡 Luminance: ${lux.toFixed(1)} lux`);
        if (this.hasCapability('measure_luminance')) {
          await this.setCapabilityValue('measure_luminance', parseFloat(lux)).catch(this.error);
        }
      });

      // Configure reporting
      try {
        await luxCluster.configureReporting({
          measuredValue: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 100
          }
        });
        this.log('[LUX] ✅ Reporting configured');
      } catch (err) {
        this.log('[LUX] ⚠️  Reporting config failed:', err.message);
      }

      // Read initial value
      try {
        const { measuredValue } = await luxCluster.readAttributes(['measuredValue']);
        const lux = Math.pow(10, (measuredValue - 1) / 10000);
        this.log(`[LUX] 📊 Initial: ${lux.toFixed(1)} lux`);
        if (this.hasCapability('measure_luminance')) {
          await this.setCapabilityValue('measure_luminance', parseFloat(lux));
        }
      } catch (err) {
        this.log('[LUX] ⚠️  Initial read failed:', err.message);
      }

      this.log('[LUX] ✅ Luminance capability registered (SDK3)');
    } catch (err) {
      this.error('[LUX] ❌ Registration failed:', err);
    }
  }

  /**
   * LEGACY SUPPORT: registerOnOffCapability (v4.1.x compatibility)
   */
  async registerOnOffCapability() {
    try {
      await this.registerCapability('onoff', CLUSTER.ON_OFF, {
        getOpts: {
          getOnStart: true,
          getOnOnline: true
        }
      });

      this.log('[LEGACY] OnOff capability registered successfully');
    } catch (err) {
      this.error('Error registering onoff capability:', err);
    }
  }

  /**
   * Get power type for use in child classes
   */
  getPowerType() {
    return this.powerType;
  }

  /**
   * Get battery type for use in child classes
   */
  getBatteryType() {
    return this.batteryType;
  }

  /**
   * Check if device is battery powered
   */
  isBatteryPowered() {
    return this.powerType === 'BATTERY';
  }

  /**
   * Check if device is AC powered
   */
  isACPowered() {
    return this.powerType === 'AC';
  }

  /**
   * REMOVED: configureAttributeReporting override (caused infinite recursion)
   *
   * Drivers now call super.configureAttributeReporting() directly with numeric cluster IDs
   */

  /**
   * Get IEEE Address with fallbacks
   * Uses official SDK v3 getNode() method with fallback to getData()
   */
  async getIeeeAddress() {
    return ZigbeeHelpers.getIeeeAddress(this);
  }

  /**
   * Helper to setup cluster listener with auto-conversion
   */
  setupClusterListener(endpoint, clusterSpec, attribute, callback) {
    return ZigbeeHelpers.setupClusterListener(endpoint, clusterSpec, attribute, callback, this);
  }

  /**
   * Helper to get cluster with fallbacks
   */
  getCluster(endpoint, clusterSpec) {
    return ZigbeeHelpers.getCluster(endpoint, clusterSpec);
  }

  /**
   * Check if device is DC powered
   */
  isDCPowered() {
    return this.powerType === 'DC';
  }

  /**
   * Enhanced battery monitoring with threshold alerts
   * Triggers flow cards when thresholds are reached
   */
  async monitorBatteryThresholds(batteryLevel) {
    if (!batteryLevel || !this.isBatteryPowered()) return;

    const lowThreshold = this.getSetting('battery_low_threshold') || 20;
    const criticalThreshold = this.getSetting('battery_critical_threshold') || 10;
    const enableNotifications = this.getSetting('enable_battery_notifications') !== false;

    const previousLevel = this.getStoreValue('previous_battery_level') || 100;

    // Check for low battery (crossing threshold)
    if (previousLevel > lowThreshold && batteryLevel <= lowThreshold && enableNotifications) {
      this.log(`[WARN] Battery LOW: ${batteryLevel}% (threshold: ${lowThreshold}%)`);

      const voltage = this.getStoreValue('battery_voltage') || 0;

      // Only trigger if device HAS battery capability
      if (this.hasCapability('measure_battery')) {
        this.homey.flow.getDeviceTriggerCard('low_battery_warning')
          .trigger(this, { device_name: this.getName(), battery_level: batteryLevel })
          .catch(err => this.log('[FLOW] low_battery_warning not available (normal if not defined)'));
      }
    }

    // Check for critical battery (crossing threshold)
    if (previousLevel > criticalThreshold && batteryLevel <= criticalThreshold && enableNotifications) {
      this.log(`[ALARM] Battery CRITICAL: ${batteryLevel}% (threshold: ${criticalThreshold}%)`);

      const voltage = this.getStoreValue('battery_voltage') || 0;

      // Only trigger if device HAS battery capability
      if (this.hasCapability('measure_battery')) {
        this.homey.flow.getDeviceTriggerCard('low_battery_warning')
          .trigger(this, { device_name: this.getName(), battery_level: batteryLevel })
          .catch(err => this.log('[FLOW] low_battery_warning not available'));
      }
    }

    // Check for fully charged
    if (previousLevel < 100 && batteryLevel === 100 && enableNotifications) {
      this.log('[OK] Battery fully charged: 100%');

      // battery_charged flow card - silently skip if not available
      if (this.hasCapability('measure_battery')) {
        this.log('[OK] Battery fully charged: 100%');
      }
    }

    // Store current level for next comparison
    await this.setStoreValue('previous_battery_level', batteryLevel);
  }

  /**
   * Handle settings changes
   * Re-detect power/battery when manual settings change
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);

    // Power source manually changed
    if (changedKeys.includes('power_source')) {
      this.log('Power source setting changed, re-detecting...');
      await this.detectPowerSource();
      await this.configurePowerCapabilities();

      // Trigger power source changed flow
      this.homey.flow.getDeviceTriggerCard('power_source_changed')
        .trigger(this, { power_source: this.powerType.toLowerCase() })
        .catch(err => this.error('Failed to trigger power_source_changed:', err));
    }

    // Battery type manually changed
    if (changedKeys.includes('battery_type') && this.isBatteryPowered()) {
      this.log('Battery type setting changed, re-detecting...');
      await this.detectBatteryType();
    }

    // Energy optimization mode changed
    if (changedKeys.includes('optimization_mode')) {
      this.log('Energy optimization changed:', newSettings.optimization_mode);
      await this.applyEnergyOptimization(newSettings.optimization_mode);
    }

    return true;
  }

  /**
   * Apply energy optimization settings
   * Adjusts polling intervals and reporting
   */
  async applyEnergyOptimization(mode) {
    this.log(`[BATTERY] Applying energy optimization: ${mode}`);

    // Different modes affect polling frequency
    const reportInterval = this.getSetting('battery_report_interval') || 24;

    try {
      if (this.isBatteryPowered() && this.zclNode.endpoints[1]?.clusters?.powerConfiguration) {
        const powerCluster = this.zclNode.endpoints[1].clusters.powerConfiguration;

        // Configure reporting based on mode
        let minInterval, maxInterval;

        switch (mode) {
          case 'performance':
            minInterval = reportInterval * 1800; // Half of interval
            maxInterval = reportInterval * 3600; // Full interval
            break;
          case 'balanced':
            minInterval = reportInterval * 3600; // Full interval
            maxInterval = reportInterval * 7200; // Double interval
            break;
          case 'power_saving':
            minInterval = reportInterval * 7200; // Double interval
            maxInterval = reportInterval * 14400; // Quadruple interval
            break;
          default:
            minInterval = reportInterval * 3600;
            maxInterval = reportInterval * 7200;
        }

        await powerCluster.configureReporting({
          batteryPercentageRemaining: {
            minInterval,
            maxInterval,
            minChange: mode === 'performance' ? 1 : (mode === 'balanced' ? 5 : 10)
          }
        }).catch(err => this.log('Configure reporting failed (non-critical):', err.message));

        this.log(`[OK] Energy optimization applied: ${mode}`);
      }
    } catch (err) {
      this.error('Energy optimization failed:', err.message);
    }
  }

  /**
   * Request immediate battery update (for flow action)
   */
  async requestBatteryUpdate() {
    if (!this.isBatteryPowered()) {
      throw new Error('Device is not battery powered');
    }

    this.log('📡 Requesting battery update...');

    try {
      const powerCluster = this.zclNode.endpoints[1]?.clusters?.powerConfiguration;
      if (powerCluster) {
        const battery = await powerCluster.readAttributes(['batteryPercentageRemaining']);

        if (battery?.batteryPercentageRemaining !== undefined) {
          const level = Math.round(battery.batteryPercentageRemaining / 2);
          if (this.hasCapability('measure_battery')) {
            await this.setCapabilityValue('measure_battery', parseFloat(level));
          }
          await this.monitorBatteryThresholds(level);

          this.log(`[OK] Battery updated: ${level}%`);
          return level;
        }
      }
    } catch (err) {
      this.error('Battery update failed:', err.message);
      throw err;
    }
  }

  /**
   * Handle endpoint commands (multi-gang switches, multi-port devices)
   * CRITICAL: This method MUST exist for commandListener to work
   * v5.5.396: CYRIL FIX - Don't add onoff to button devices!
   */
  async handleEndpointCommand(endpointId, clusterName, command, payload = {}) {
    this.log(`[CMD] 📥 Endpoint ${endpointId} ${clusterName}.${command}`, payload);

    try {
      // OnOff commands
      if (clusterName === 'onOff') {
        // v5.5.396: CRITICAL FIX - Button devices should NOT get onoff capability
        // They should trigger button press flows instead
        const isButtonDevice = this._forcedDeviceType === 'BUTTON' ||
          this._forbiddenCapabilities?.includes('onoff') ||
          this.driver?.manifest?.class === 'button';

        if (isButtonDevice) {
          // For buttons: trigger button press flow instead of setting onoff
          this.log(`[CMD] 🔘 Button press detected on endpoint ${endpointId}`);
          const buttonIndex = endpointId || 1;
          const pressType = command === 'on' ? 'single' : (command === 'off' ? 'double' : 'single');

          // Trigger button press if method exists
          if (typeof this.triggerButtonPress === 'function') {
            await this.triggerButtonPress(buttonIndex, pressType);
          } else {
            // Fallback: trigger flow card directly
            const flowTrigger = this.homey.flow.getDeviceTriggerCard(`button_${buttonIndex}_pressed`);
            if (flowTrigger) {
              await flowTrigger.trigger(this, { press_type: pressType }).catch(() => { });
            }
          }
          this.log(`[CMD] ✅ Button ${buttonIndex} ${pressType} press triggered`);
          return;
        }

        // Normal switch/plug behavior
        if (command === 'on' || command === 'off') {
          const state = command === 'on';
          let cap = endpointId > 1 ? `onoff.ep${endpointId}` : 'onoff';

          if (!this.hasCapability(cap)) {
            await Promise.resolve(addCapability(cap)).catch(this.error);
          }

          await Promise.resolve(setCapabilityValue(cap, state)).catch(this.error);
          this.log(`[CMD] ✅ ${cap} = ${state}`);
          return;
        }

        if (command === 'toggle') {
          const cap = endpointId > 1 ? `onoff.ep${endpointId}` : 'onoff';
          const current = await Promise.resolve(getCapabilityValue(cap)).catch(() => false);
          await Promise.resolve(setCapabilityValue(cap, !current)).catch(this.error);
          return;
        }
      }

      this.log(`[CMD] ⚠️  Unhandled: ${clusterName}.${command}`);
    } catch (err) {
      this.error('[CMD] Error:', err);
    }
  }

  /**
   * Safe bind with guards (prevents crashes)
   */
  async safeBind(cluster, targetEndpoint) {
    if (!cluster || typeof cluster.bind !== 'function') {
      this.log('[BIND] ℹ️  bind() not supported, skipping');
      return false;
    }

    try {
      await cluster.Promise.resolve(bind(targetEndpoint)).catch(() => { });
      this.log('[BIND] ✅ Succeeded');
      return true;
    } catch (err) {
      this.log('[BIND] ⚠️  Failed (non-critical):', err.message);
      return false;
    }
  }

  /**
   * Tuya DP Pool Management
   */
  ensureDpMapping() {
    this.dpMap = this.dpMap || {};
    this.dpPool = this.dpPool || [
      'tuya_dp_1', 'tuya_dp_2', 'tuya_dp_3', 'tuya_dp_4',
      'tuya_dp_5', 'tuya_dp_6', 'tuya_dp_7', 'tuya_dp_8'
    ];
  }

  async setTuyaDpValue(dp, value) {
    this.ensureDpMapping();
    let cap = this.dpMap[dp];

    if (!cap) {
      cap = this.dpPool.find(c => !this.getCapabilities().includes(c));
      if (!cap) {
        this.warn('[DP] No free slot!');
        return;
      }
      this.dpMap[dp] = cap;
      if (!this.hasCapability(cap)) {
        await Promise.resolve(addCapability(cap)).catch(this.error);
      }
      this.log(`[DP] Mapped ${dp} → ${cap}`);
    }

    await Promise.resolve(setCapabilityValue(cap, value)).catch(this.error);
  }

  /**
   * Migrate capabilities for existing devices (add missing ones)
   */
  async migrateCapabilities() {
    this.log('[MIGRATE] 🔄 Checking for missing capabilities...');

    try {
      // v5.2.78: Guard against deleted/ghost devices
      // Check if device is still valid before attempting any capability changes
      try {
        const deviceData = this.getData?.();
        if (!deviceData || !deviceData.id) {
          this.log('[MIGRATE] ⚠️ Device data not available - skipping migration');
          return;
        }
        // Additional check: try to access a device property that would fail on deleted device
        const available = this.getAvailable?.();
        if (available === undefined && !this.zclNode) {
          this.log('[MIGRATE] ⚠️ Device may be deleted - skipping migration');
          return;
        }
      } catch (guardErr) {
        this.log('[MIGRATE] ⚠️ Device validation failed - likely deleted:', guardErr.message);
        return;
      }

      const driverManifest = this.driver?.manifest;
      if (!driverManifest || !driverManifest.capabilities) {
        this.log('[MIGRATE] ⚠️ No driver manifest capabilities found');
        return;
      }

      const expectedCapabilities = driverManifest.capabilities;
      const currentCapabilities = this.getCapabilities();

      this.log(`[MIGRATE] Expected: ${JSON.stringify(expectedCapabilities)}`);
      this.log(`[MIGRATE] Current: ${JSON.stringify(currentCapabilities)}`);

      // Add missing capabilities
      for (const cap of expectedCapabilities) {
        if (!this.hasCapability(cap)) {
          this.log(`[MIGRATE] ➕ Adding missing capability: ${cap}`);
          try {
            await this.addCapability(cap);
            this.log(`[MIGRATE] ✅ Added: ${cap}`);
          } catch (err) {
            // v5.2.78: Handle "Not Found" errors gracefully (device deleted)
            if (err.message?.includes('Not Found') || err.message?.includes('Device with ID')) {
              this.log('[MIGRATE] ⚠️ Device no longer exists - stopping migration');
              return; // Stop trying if device is gone
            }
            this.error(`[MIGRATE] ❌ Failed to add ${cap}:`, err.message);
          }
        }
      }

      // CRITICAL: Remove capabilities NOT in manifest (legacy cleanup)
      for (const cap of currentCapabilities) {
        if (!expectedCapabilities.includes(cap) && cap.startsWith('measure_battery')) {
          this.log(`[MIGRATE] 🗑️ Removing legacy capability: ${cap}`);
          try {
            await this.removeCapability(cap);
            this.log(`[MIGRATE] ✅ Removed legacy: ${cap}`);
          } catch (err) {
            this.error(`[MIGRATE] ❌ Failed to remove ${cap}:`, err.message);
          }
        }
      }

      this.log('[MIGRATE] ✅ Capability migration complete');
    } catch (err) {
      this.error('[MIGRATE] ❌ Migration failed:', err.message);
    }
  }

  /**
   * Force initial read of all attributes (fallback for non-reporting devices)
   * v5.2.80: Enhanced with HYBRID mode support and better retry logic
   * v5.2.84: Skip for pure Tuya DP devices (avoids timeouts)
   */
  async forceInitialRead() {
    this.log('[INITIAL-READ] 📖 Force reading all attributes...');

    // v5.2.84: Skip for pure Tuya DP devices - they use DP events, not ZCL reads
    const modelId = this.getSetting?.('zb_modelId') || '';
    const mfr = this.getSetting?.('zb_manufacturerName') || '';
    const isPureTuyaDP = (modelId === 'TS0601' || mfr.startsWith('_TZE')) && this._isPureTuyaDP;

    if (isPureTuyaDP) {
      this.log('[INITIAL-READ] ℹ️ Pure Tuya DP device - skipping ZCL reads');
      this.log('[INITIAL-READ] ℹ️ Data will arrive via Tuya DP events');
      return;
    }

    // v5.2.80: Check if we're in HYBRID mode (use standard clusters for TS0601)
    const isHybridMode = this.protocolRouter?.protocol === 'HYBRID';
    if (isHybridMode) {
      this.log('[INITIAL-READ] 🔄 HYBRID mode - prioritizing standard cluster reads');
    }

    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[INITIAL-READ] ⚠️ No endpoint 1 available');
        return;
      }

      // Log available clusters for debugging
      const clusterNames = Object.keys(endpoint.clusters || {});
      this.log(`[INITIAL-READ] Available clusters: ${clusterNames.join(', ')}`);

      // Battery - ENHANCED with voltage fallback and timeout
      // v5.5.34: Skip ZCL battery read for devices using Tuya DP battery
      if (this.hasCapability('measure_battery') && endpoint.clusters?.powerConfiguration && !this.skipZclBatteryPolling && !this.usesTuyaDPBattery) {
        try {
          this.log('[INITIAL-READ] 🔋 Reading battery (timeout: 5s)...');
          const batteryPromise = endpoint.clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
          const batteryData = await Promise.race([
            batteryPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]).catch(() => null);

          if (batteryData && batteryData.batteryPercentageRemaining != null) {
            const battery = Math.round(batteryData.batteryPercentageRemaining / 2);
            this.log(`[INITIAL-READ] ✅ Battery: ${battery}%`);
            if (this.hasCapability('measure_battery')) {
              await Promise.resolve(this.setCapabilityValue('measure_battery', parseFloat(battery))).catch(this.error);
            }
          } else {
            // Fallback: try voltage
            this.log('[INITIAL-READ] 🔋 Trying voltage fallback...');
            const voltageData = await endpoint.clusters.powerConfiguration.readAttributes(['batteryVoltage']).catch(() => null);
            if (voltageData && voltageData.batteryVoltage) {
              const voltage = voltageData.batteryVoltage / 10;
              const percent = Math.max(0, Math.min(100, Math.round((voltage - 2.0) / 1.0 * 100)));
              this.log(`[INITIAL-READ] ✅ Battery: ${percent}% (from ${voltage}V)`);
              if (this.hasCapability('measure_battery')) {
                await Promise.resolve(this.setCapabilityValue('measure_battery', parseFloat(percent))).catch(this.error);
              }
            }
          }
        } catch (err) {
          this.log(`[INITIAL-READ] ❌ Battery failed: ${err.message}`);
        }
      }

      // Temperature - v5.2.80: Enhanced with timeout
      if (endpoint.clusters?.temperatureMeasurement || endpoint.clusters?.msTemperatureMeasurement) {
        try {
          this.log('[INITIAL-READ] 🌡️ Reading temperature (timeout: 5s)...');
          const cluster = endpoint.clusters.temperatureMeasurement || endpoint.clusters.msTemperatureMeasurement;
          const tempPromise = cluster.readAttributes(['measuredValue']);
          const tempData = await Promise.race([
            tempPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]).catch(err => {
            this.log(`[INITIAL-READ] ⚠️ Temperature read: ${err.message}`);
            return null;
          });
          if (tempData && tempData.measuredValue !== null && tempData.measuredValue !== undefined) {
            const temp = tempData.measuredValue / 100;
            this.log(`[INITIAL-READ] ✅ Temperature: ${temp}°C`);
            if (this.hasCapability('measure_temperature')) {
              await Promise.resolve(this.setCapabilityValue('measure_temperature', parseFloat(temp))).catch(this.error);
            }
          } else {
            this.log('[INITIAL-READ] ⚠️ Temperature: no data (device sleeping?)');
          }
        } catch (err) {
          this.log(`[INITIAL-READ] ❌ Temperature failed: ${err.message}`);
        }
      }

      // Humidity - v5.2.80: Enhanced with timeout
      if (endpoint.clusters?.relativeHumidity || endpoint.clusters?.msRelativeHumidity) {
        try {
          this.log('[INITIAL-READ] 💧 Reading humidity (timeout: 5s)...');
          const cluster = endpoint.clusters.relativeHumidity || endpoint.clusters.msRelativeHumidity;
          const humidityPromise = cluster.readAttributes(['measuredValue']);
          const humidityData = await Promise.race([
            humidityPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
          ]).catch(err => {
            this.log(`[INITIAL-READ] ⚠️ Humidity read: ${err.message}`);
            return null;
          });
          if (humidityData && humidityData.measuredValue !== null && humidityData.measuredValue !== undefined) {
            const humidity = humidityData.measuredValue / 100;
            this.log(`[INITIAL-READ] ✅ Humidity: ${humidity}%`);
            if (this.hasCapability('measure_humidity')) {
              await Promise.resolve(this.setCapabilityValue('measure_humidity', parseFloat(humidity))).catch(this.error);
            }
          } else {
            this.log('[INITIAL-READ] ⚠️ Humidity: no data (device sleeping?)');
          }
        } catch (err) {
          this.log(`[INITIAL-READ] ❌ Humidity failed: ${err.message}`);
        }
      }

      // Luminance
      if (endpoint.clusters?.illuminanceMeasurement) {
        try {
          const luxData = await endpoint.clusters.illuminanceMeasurement.Promise.resolve(readAttributes(['measuredValue'])).catch(() => null);
          if (luxData && luxData.measuredValue !== null) {
            const lux = Math.pow(10, (luxData.measuredValue - 1) / 10000);
            this.log(`[INITIAL-READ] ✅ Luminance: ${lux} lux`);
            if (this.hasCapability('measure_luminance')) {
              await Promise.resolve(this.setCapabilityValue('measure_luminance', parseFloat(lux))).catch(this.error);
            }
          }
        } catch (err) {
          this.log(`[INITIAL-READ] ⚠️ Luminance read failed: ${err.message}`);
        }
      }

      this.log('[INITIAL-READ] ✅ Force read complete');
    } catch (err) {
      this.error('[INITIAL-READ] ❌ Force read failed:', err.message);
    }
  }

  /**
   * v5.2.82: UNIVERSAL HYBRID MODE
   * v5.2.84: Skip for pure Tuya DP devices (TS0601 without functional ZCL clusters)
   * Intelligently setup standard ZCL cluster listeners for ALL devices
   * Works alongside Tuya DP for maximum compatibility
   */
  async _setupUniversalHybridMode() {
    this.log('[HYBRID] ════════════════════════════════════════════════════════');
    this.log('[HYBRID] 🔄 Universal HYBRID Mode Initialization');
    this.log('[HYBRID] ════════════════════════════════════════════════════════');

    try {
      // v5.3.62: FIXED - Check if this is a pure Tuya DP device that shouldn't use ZCL
      // Use getSettings() which returns an object, not getSetting() which doesn't exist
      const settings = this.getSettings?.() || {};
      const store = this.getStore?.() || {};
      const modelId = settings.zb_modelId || store.modelId || '';
      const mfr = settings.zb_manufacturerName || store.manufacturerName || '';

      // v5.3.62: Also check _isPureTuyaDP flag set by child classes
      const isTuyaDP = modelId === 'TS0601' || mfr.startsWith('_TZE') || this._isPureTuyaDP || this._blockZCL;

      this.log(`[HYBRID] Device check: modelId="${modelId}", mfr="${mfr}", isTuyaDP=${isTuyaDP}`);

      if (isTuyaDP) {
        // v5.3.62: For Tuya DP devices, ALWAYS skip hybrid mode
        // Even if they expose ZCL clusters, they don't actually report through them
        this.log('[HYBRID] ℹ️ Pure Tuya DP device detected (TS0601 / _TZE*)');
        this.log('[HYBRID] ℹ️ Skipping ZCL cluster setup - will use Tuya DP only');
        this.log('[HYBRID] ℹ️ Data will arrive via DP events when device wakes up');
        this._hybridModeActive = false;
        this._isPureTuyaDP = true;
        return;
      }

      const endpoint = this.zclNode?.endpoints?.[1];
      if (!endpoint) {
        this.log('[HYBRID] ⚠️ No endpoint 1 - skipping');
        return;
      }

      const clusters = endpoint.clusters || {};
      const clusterNames = Object.keys(clusters);
      this.log(`[HYBRID] Available clusters: ${clusterNames.join(', ')}`);

      // v5.2.84: For TS0601, verify clusters are actually functional before setup
      if (isTuyaDP && clusterNames.length <= 2) {
        this.log('[HYBRID] ℹ️ TS0601 with minimal clusters - using Tuya DP only');
        this._hybridModeActive = false;
        this._isPureTuyaDP = true;
        return;
      }

      // Track what we setup
      const hybridCapabilities = {
        temperature: false,
        humidity: false,
        battery: false,
        power: false,
        illuminance: false,
        onoff: false
      };

      // v5.3.50: CRITICAL FIX - Track listeners to prevent duplicates and enable cleanup
      // This fixes MaxListenersExceededWarning when multiple device instances share clusters
      if (!this._clusterListeners) {
        this._clusterListeners = [];
      }

      // Helper to safely add listener with tracking and deduplication
      const safeAddListener = (cluster, event, handler, clusterName) => {
        // Create unique key for this listener
        const listenerKey = `${clusterName}:${event}:${this.getData().id}`;

        // Check if already registered for this device
        if (this._clusterListeners.find(l => l.key === listenerKey)) {
          this.log(`[HYBRID] ⏭️ Listener ${event} already registered on ${clusterName}`);
          return;
        }

        // Bind handler to this device instance
        const boundHandler = handler.bind(this);

        // Store reference for cleanup
        this._clusterListeners.push({
          key: listenerKey,
          cluster,
          event,
          handler: boundHandler
        });

        // Add the listener
        cluster.on(event, boundHandler);
        this.log(`[HYBRID] ✅ Listener ${event} registered on ${clusterName}`);
      };

      // ═══════════════════════════════════════════════════════════════
      // CLIMATE CLUSTERS (temperature, humidity)
      // ═══════════════════════════════════════════════════════════════

      // Temperature (0x0402)
      const tempCluster = clusters.temperatureMeasurement || clusters.msTemperatureMeasurement;
      if (tempCluster && this.hasCapability('measure_temperature')) {
        this.log('[HYBRID] 🌡️ Setting up temperature cluster listener...');
        try {
          // CRITICAL: Use safe listener registration
          safeAddListener(tempCluster, 'attr.measuredValue', function (value) {
            const temp = Math.round((value / 100) * 10) / 10;
            this.log(`[HYBRID] 🌡️ Temperature: ${temp}°C`);
            this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(this.error);
            if (typeof this.setLastSeenAt === 'function') this.setLastSeenAt();
          }, 'temperatureMeasurement');

          // Try to read initial value (with timeout for battery devices)
          const readPromise = tempCluster.readAttributes(['measuredValue'])
            .then(data => {
              if (data?.measuredValue != null) {
                const temp = Math.round((data.measuredValue / 100) * 10) / 10;
                this.log(`[HYBRID] 🌡️ Initial temperature: ${temp}°C`);
                this.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(this.error);
              }
            })
            .catch(() => this.log('[HYBRID] ⚠️ Temperature read failed (device may be sleeping)'));

          // Don't wait more than 3s for read
          await Promise.race([readPromise, new Promise(r => setTimeout(r, 3000))]);

          // Configure reporting in background (don't block - battery devices often fail)
          if (typeof tempCluster.configureReporting === 'function') {
            tempCluster.configureReporting({
              measuredValue: { minInterval: 60, maxInterval: 3600, minChange: 10 }
            }).catch(() => this.log('[HYBRID] ⚠️ Temperature reporting config skipped'));
          }

          hybridCapabilities.temperature = true;
          this.log('[HYBRID] ✅ Temperature cluster configured');
        } catch (err) {
          this.log('[HYBRID] ⚠️ Temperature setup failed:', err.message);
        }
      }

      // Humidity (0x0405)
      const humCluster = clusters.relativeHumidity || clusters.msRelativeHumidity;
      if (humCluster && this.hasCapability('measure_humidity')) {
        this.log('[HYBRID] 💧 Setting up humidity cluster listener...');
        try {
          // CRITICAL: Use safe listener registration
          safeAddListener(humCluster, 'attr.measuredValue', function (value) {
            const hum = Math.round(value / 100);
            this.log(`[HYBRID] 💧 Humidity: ${hum}%`);
            this.setCapabilityValue('measure_humidity', parseFloat(hum)).catch(this.error);
            if (typeof this.setLastSeenAt === 'function') this.setLastSeenAt();
          }, 'relativeHumidity');

          // Try to read initial value (with timeout)
          const readPromise = humCluster.readAttributes(['measuredValue'])
            .then(data => {
              if (data?.measuredValue != null) {
                const hum = Math.round(data.measuredValue / 100);
                this.log(`[HYBRID] 💧 Initial humidity: ${hum}%`);
                this.setCapabilityValue('measure_humidity', parseFloat(hum)).catch(this.error);
              }
            })
            .catch(() => this.log('[HYBRID] ⚠️ Humidity read failed (device may be sleeping)'));

          await Promise.race([readPromise, new Promise(r => setTimeout(r, 3000))]);

          // Configure reporting in background (don't block)
          if (typeof humCluster.configureReporting === 'function') {
            humCluster.configureReporting({
              measuredValue: { minInterval: 60, maxInterval: 3600, minChange: 100 }
            }).catch(() => this.log('[HYBRID] ⚠️ Humidity reporting config skipped'));
          }

          hybridCapabilities.humidity = true;
          this.log('[HYBRID] ✅ Humidity cluster configured');
        } catch (err) {
          this.log('[HYBRID] ⚠️ Humidity setup failed:', err.message);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // POWER/ENERGY CLUSTERS (battery, mains, metering)
      // ═══════════════════════════════════════════════════════════════

      // Battery (0x0001)
      const powerCluster = clusters.powerConfiguration || clusters.genPowerCfg;
      if (powerCluster && this.hasCapability('measure_battery')) {
        this.log('[HYBRID] 🔋 Setting up battery cluster listener...');
        try {
          // CRITICAL: Use safe listener registration
          safeAddListener(powerCluster, 'attr.batteryPercentageRemaining', function (value) {
            const battery = Math.round(value / 2);
            this.log(`[HYBRID] 🔋 Battery: ${battery}%`);
            if (this.hasCapability('measure_battery')) {
              this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(this.error);
            }
            if (typeof this.setLastSeenAt === 'function') this.setLastSeenAt();
          }, 'powerConfiguration');

          safeAddListener(powerCluster, 'attr.batteryVoltage', function (value) {
            const voltage = value / 10;
            const battery = Math.max(0, Math.min(100, Math.round((voltage - 2.0) / 1.2 * 100)));
            this.log(`[HYBRID] 🔋 Battery (from ${voltage}V): ${battery}%`);
            if (this.hasCapability('measure_battery')) {
              this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(this.error);
            }
            if (typeof this.setLastSeenAt === 'function') this.setLastSeenAt();
          }, 'powerConfiguration');

          // Try to read initial value (with timeout)
          const readPromise = powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage'])
            .then(data => {
              if (data?.batteryPercentageRemaining != null) {
                const battery = Math.round(data.batteryPercentageRemaining / 2);
                this.log(`[HYBRID] 🔋 Initial battery: ${battery}%`);
                if (this.hasCapability('measure_battery')) {
                  this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(this.error);
                }
              } else if (data?.batteryVoltage != null) {
                const voltage = data.batteryVoltage / 10;
                const battery = Math.max(0, Math.min(100, Math.round((voltage - 2.0) / 1.2 * 100)));
                this.log(`[HYBRID] 🔋 Initial battery (from ${voltage}V): ${battery}%`);
                if (this.hasCapability('measure_battery')) {
                  this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(this.error);
                }
              }
            })
            .catch(() => this.log('[HYBRID] ⚠️ Battery read failed (device may be sleeping)'));

          await Promise.race([readPromise, new Promise(r => setTimeout(r, 3000))]);

          // Configure reporting in background (don't block)
          if (typeof powerCluster.configureReporting === 'function') {
            powerCluster.configureReporting({
              batteryPercentageRemaining: { minInterval: 3600, maxInterval: 43200, minChange: 2 }
            }).catch(() => this.log('[HYBRID] ⚠️ Battery reporting config skipped'));
          }

          hybridCapabilities.battery = true;
          this.log('[HYBRID] ✅ Battery cluster configured');
        } catch (err) {
          this.log('[HYBRID] ⚠️ Battery setup failed:', err.message);
        }
      }

      // Electrical Measurement (0x0B04) - AC power
      const elecCluster = clusters.electricalMeasurement || clusters.haElectricalMeasurement;
      if (elecCluster) {
        this.log('[HYBRID] ⚡ Setting up electrical measurement cluster...');
        try {
          // Active power
          if (this.hasCapability('measure_power')) {
            elecCluster.on('attr.activePower', (value) => {
              const power = value / 10; // Usually in 0.1W
              this.log(`[HYBRID] ⚡ Power: ${power}W`);
              this.setCapabilityValue('measure_power', parseFloat(power)).catch(this.error);
            });
          }

          // Voltage
          if (this.hasCapability('measure_voltage')) {
            elecCluster.on('attr.rmsVoltage', (value) => {
              const voltage = value / 10;
              this.log(`[HYBRID] ⚡ Voltage: ${voltage}V`);
              this.setCapabilityValue('measure_voltage', parseFloat(voltage)).catch(this.error);
            });
          }

          // Current
          if (this.hasCapability('measure_current')) {
            elecCluster.on('attr.rmsCurrent', (value) => {
              const current = value / 1000; // Usually in mA
              this.log(`[HYBRID] ⚡ Current: ${current}A`);
              this.setCapabilityValue('measure_current', parseFloat(current)).catch(this.error);
            });
          }

          hybridCapabilities.power = true;
          this.log('[HYBRID] ✅ Electrical measurement configured');
        } catch (err) {
          this.log('[HYBRID] ⚠️ Electrical measurement setup failed:', err.message);
        }
      }

      // Metering (0x0702) - Energy consumption
      const meterCluster = clusters.metering || clusters.seMetering;
      if (meterCluster && this.hasCapability('meter_power')) {
        this.log('[HYBRID] 📊 Setting up metering cluster...');
        try {
          meterCluster.on('attr.currentSummationDelivered', (value) => {
            const energy = value / 1000; // Usually in Wh, convert to kWh
            this.log(`[HYBRID] 📊 Energy: ${energy}kWh`);
            this.setCapabilityValue('meter_power', parseFloat(energy)).catch(this.error);
          });

          this.log('[HYBRID] ✅ Metering configured');
        } catch (err) {
          this.log('[HYBRID] ⚠️ Metering setup failed:', err.message);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // ILLUMINANCE CLUSTER (0x0400)
      // ═══════════════════════════════════════════════════════════════
      const illumCluster = clusters.illuminanceMeasurement || clusters.msIlluminanceMeasurement;
      if (illumCluster && this.hasCapability('measure_luminance')) {
        this.log('[HYBRID] ☀️ Setting up illuminance cluster...');
        try {
          illumCluster.on('attr.measuredValue', (value) => {
            // Convert from log scale: lux = 10^((value-1)/10000)
            const lux = value > 0 ? Math.round(Math.pow(10, (value - 1) / 10000)) : 0;
            this.log(`[HYBRID] ☀️ Illuminance: ${lux} lux`);
            this.setCapabilityValue('measure_luminance', parseFloat(lux)).catch(this.error);
          });

          hybridCapabilities.illuminance = true;
          this.log('[HYBRID] ✅ Illuminance configured');
        } catch (err) {
          this.log('[HYBRID] ⚠️ Illuminance setup failed:', err.message);
        }
      }

      // ═══════════════════════════════════════════════════════════════
      // ON/OFF CLUSTER (0x0006) - for switches/plugs
      // v5.5.396: CYRIL FIX - Skip for button devices!
      // ═══════════════════════════════════════════════════════════════
      const onoffCluster = clusters.onOff || clusters.genOnOff;
      const isButtonDevice = this._forcedDeviceType === 'BUTTON' ||
        this._forbiddenCapabilities?.includes('onoff') ||
        this.driver?.manifest?.class === 'button';

      if (onoffCluster && this.hasCapability('onoff') && !isButtonDevice) {
        this.log('[HYBRID] 💡 Setting up on/off cluster listener...');
        try {
          onoffCluster.on('attr.onOff', (value) => {
            const isOn = Boolean(value);
            this.log(`[HYBRID] 💡 OnOff: ${isOn}`);
            this.setCapabilityValue('onoff', isOn).catch(this.error);
          });

          hybridCapabilities.onoff = true;
          this.log('[HYBRID] ✅ On/Off cluster configured');
        } catch (err) {
          this.log('[HYBRID] ⚠️ On/Off setup failed:', err.message);
        }
      } else if (onoffCluster && isButtonDevice) {
        this.log('[HYBRID] 🔘 Skipping on/off cluster for button device (uses flow triggers)');
      }

      // ═══════════════════════════════════════════════════════════════
      // SUMMARY
      // ═══════════════════════════════════════════════════════════════
      const activeCapabilities = Object.entries(hybridCapabilities)
        .filter(([_, active]) => active)
        .map(([name]) => name);

      if (activeCapabilities.length > 0) {
        this.log('[HYBRID] ════════════════════════════════════════════════════════');
        this.log(`[HYBRID] ✅ HYBRID MODE ACTIVE: ${activeCapabilities.join(', ')}`);
        this.log('[HYBRID] ════════════════════════════════════════════════════════');
        this._hybridModeActive = true;
        this._hybridCapabilities = hybridCapabilities;
      } else {
        this.log('[HYBRID] ℹ️ No standard clusters to configure (pure Tuya DP device)');
        this._hybridModeActive = false;
      }

    } catch (err) {
      this.error('[HYBRID] ❌ Universal HYBRID mode failed:', err.message);
    }
  }

  /**
   * Schedule periodic attribute polling (for battery/sleeping devices)
   */
  async scheduleAttributePolling() {
    // Only poll for battery devices
    if (this.powerType !== 'BATTERY') {
      this.log('[POLLING] ℹ️ Skipping - not a battery device');
      return;
    }

    // Clear existing timer
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }

    // Get polling interval from settings (default 6h)
    const pollingHours = this.getSetting('polling_interval') || 6;
    const pollingMs = pollingHours * 60 * 60 * 1000;

    this.log(`[POLLING] 📅 Scheduling attribute polling every ${pollingHours}h`);

    this.pollingTimer = setInterval(async () => {
      this.log('[POLLING] 🔄 Running scheduled attribute read...');
      await this.forceInitialRead();
    }, pollingMs);
  }

  /**
   * Remove battery capability from AC-powered devices
   */
  async removeBatteryFromACDevices() {
    // Only run after power detection
    if (this.powerType !== 'AC' && this.powerType !== 'DC') {
      return;
    }

    this.log('[MIGRATE] 🔋 Removing battery capability from AC/DC device...');

    if (this.hasCapability('measure_battery')) {
      try {
        await this.removeCapability('measure_battery');
        this.log('[MIGRATE] ✅ Removed measure_battery from AC/DC device');
      } catch (err) {
        this.error('[MIGRATE] ❌ Failed to remove measure_battery:', err.message);
      }
    }
  }

  /**
   * Log complete device identity for diagnostics
   */
  async logDeviceIdentity() {
    try {
      this.log('📋 DEVICE IDENTITY:');
      this.log(`   - Driver ID: ${this.driver?.id || 'unknown'}`);
      this.log(`   - Driver Class: ${this.constructor?.name || 'unknown'}`);
      this.log(`   - Device Name: ${this.getName() || 'unknown'}`);
      this.log(`   - Device ID: ${this.getData()?.id || 'unknown'}`);

      // CRITICAL: Force read device info with retries
      this.log('⚡ [FIX] Reading device manufacturer & model (with retries)...');
      if (this.zclNode?.endpoints?.[1]?.clusters?.basic) {
        // Try 3 times with increasing delays
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            this.log(`  Attempt ${attempt}/3...`);
            const deviceInfo = await this.zclNode.endpoints[1].clusters.basic.readAttributes(['manufacturerName', 'modelId', 'zclVersion']);
            if (deviceInfo && (deviceInfo.manufacturerName || deviceInfo.modelId)) {
              this.log('📦 ✅ Device info read successfully!');
              // Store for later use
              if (deviceInfo.manufacturerName) {
                this.zclNode.manufacturerName = deviceInfo.manufacturerName;
                this.log(`  ✅ Manufacturer: ${deviceInfo.manufacturerName}`);
              }
              if (deviceInfo.modelId) {
                this.zclNode.modelId = deviceInfo.modelId;
                this.log(`  ✅ Model: ${deviceInfo.modelId}`);
              }
              break; // Success!
            } else {
              this.log('  ⚠️  Empty response, retrying...');
            }
          } catch (err) {
            this.log(`  ⚠️  Attempt ${attempt} failed: ${err.message}`);
            if (attempt < 3) {
              await new Promise(r => setTimeout(r, attempt * 1000)); // 1s, 2s delays
            }
          }
        }
      }

      this.log(`   - IEEE Address: ${this.zclNode?.ieeeAddr || this.getData()?.ieeeAddress || 'unknown'}`);
      this.log(`   - Network Address: ${this.zclNode?.networkAddress || this.getData()?.networkAddress || 'unknown'}`);
      this.log(`   - Manufacturer: ${this.zclNode?.manufacturerName || this.getData()?.manufacturerName || 'unknown'}`);
      this.log(`   - Model ID: ${this.zclNode?.modelId || this.getData()?.modelId || 'unknown'}`);
      this.log(`   - Endpoints: ${Object.keys(this.zclNode?.endpoints || {}).filter(ep => ep !== 'getDeviceEndpoint').length}`);

      // Log endpoints
      const endpoints = Object.keys(this.zclNode?.endpoints || {}).filter(ep => ep !== 'getDeviceEndpoint');
      this.log(`   - Endpoints: ${endpoints.join(', ')}`);

      // Log clusters per endpoint
      this.log('');
      this.log('📡 AVAILABLE CLUSTERS PER ENDPOINT:');
      for (const epId of endpoints) {
        const endpoint = this.zclNode.endpoints[epId];
        if (endpoint?.clusters) {
          const clusterNames = Object.keys(endpoint.clusters)
            .filter(c => c !== 'getClusterById' && c !== 'bind' && c !== 'unbind')
            .map(c => {
              const cluster = endpoint.clusters[c];
              const id = cluster?.constructor?.ID || '?';
              return `${c} (ID: ${id})`;
            });
          this.log(`   Endpoint ${epId}:`);
          this.log(`     Clusters: ${clusterNames.join(', ')}`);
        }
      }

      // Log capabilities
      this.log('');
      this.log('⚙️  DEVICE CAPABILITIES:');
      const capabilities = this.getCapabilities();
      this.log(`   - Total: ${capabilities.length}`);
      this.log(`   - List: ${capabilities.join(', ')}`);

      // Log settings
      this.log('');
      this.log('🔧 DEVICE SETTINGS:');
      const settings = this.getSettings();
      for (const [key, value] of Object.entries(settings)) {
        this.log(`   - ${key}: ${value}`);
      }

      this.log('════════════════════════════════════════════════════════════════════════════════');

    } catch (err) {
      this.error('❌ Device identity logging failed:', err.message);
    }
  }

  /**
   * Register capability with simple retry
   * @deprecated Use standard registerCapability() instead - handled automatically by SDK3
   */
  async registerCapabilityWithRetry(capability, clusterId, options) {
    // Direct call - SDK3 handles retries internally
    return await this.registerCapability(capability, clusterId, options)
      .then(() => true)
      .catch((err) => {
        this.log(`[REGISTER] ⚠️ ${capability} registration failed:`, err.message);
        return false;
      });
  }

  /**
   * Simple battery read with fallback (like old working versions)
   * v5.5.34: Skip for devices using Tuya DP battery
   */
  async retryBatteryRead(maxRetries = 3) {
    // v5.5.34: Skip ZCL battery read for devices using Tuya DP battery
    if (this.skipZclBatteryPolling || this.usesTuyaDPBattery) {
      this.log('[BATTERY] Skipping ZCL battery read (using Tuya DP)');
      return null;
    }

    // Simple delays
    const delays = [3000, 5000]; // 3s, 5s

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Wait before retry (simple)
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, delays[attempt - 1] || 5000));
        }

        const endpoint = this.zclNode?.endpoints?.[1]; // Always endpoint 1 (simple)
        if (!endpoint?.clusters?.powerConfiguration) {
          continue; // Skip silently
        }

        const batteryData = await endpoint.clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']).catch(() => null);

        if (batteryData?.batteryPercentageRemaining != null) {
          const battery = Math.round(batteryData.batteryPercentageRemaining / 2);

          if (this.hasCapability('measure_battery')) {
            await this.setCapabilityValue('measure_battery', parseFloat(battery)).catch(() => { }); // Silent fail
          }

          return battery;
        }
      } catch (err) {
        // Silent retry
      }
    }

    // Fallback: set default 50% (better than nothing)
    if (this.hasCapability('measure_battery')) {
      await this.setCapabilityValue('measure_battery', 50).catch(() => { });
    }

    return null;
  }

  /**
   * v5.5.824: CRITICAL FIX - Check if reporting needs to be configured
   * This was the root cause of "devices not working after update"
   * Previously, reporting was only configured on isFirstInit(), meaning
   * devices never got re-configured after app updates!
   */
  _shouldConfigureReporting() {
    // Always configure on first init
    if (this.isFirstInit()) {
      this.log('[REPORTING-CHECK] ✅ First init - needs configuration');
      return true;
    }

    // Check if app version changed (force reconfigure after updates)
    const currentVersion = '5.5.824';
    const lastConfiguredVersion = this.getStoreValue('lastConfiguredVersion') || '0.0.0';
    
    if (lastConfiguredVersion !== currentVersion) {
      this.log(`[REPORTING-CHECK] ✅ App updated (${lastConfiguredVersion} → ${currentVersion}) - needs reconfiguration`);
      return true;
    }

    // Check if device has never received any data (likely misconfigured)
    const hasReceivedData = this.getStoreValue('hasReceivedData') || false;
    if (!hasReceivedData) {
      this.log('[REPORTING-CHECK] ✅ Device never received data - needs configuration');
      return true;
    }

    this.log('[REPORTING-CHECK] ⏭️ Already configured for this version');
    return false;
  }

  /**
   * v5.5.824: Fallback cluster binding when full registration fails
   * At minimum, try to bind essential clusters so device can push data
   */
  async _fallbackClusterBinding() {
    this.log('[FALLBACK-BIND] 🔄 Attempting essential cluster bindings...');
    
    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) {
      this.log('[FALLBACK-BIND] ❌ No clusters available');
      return;
    }

    const essentialClusters = [
      'powerConfiguration',
      'temperatureMeasurement', 
      'relativeHumidity',
      'msTemperatureMeasurement',
      'msRelativeHumidity',
      'iasZone',
      'occupancySensing',
      'onOff'
    ];

    let boundCount = 0;
    for (const clusterName of essentialClusters) {
      const cluster = endpoint.clusters[clusterName];
      if (cluster && typeof cluster.bind === 'function') {
        try {
          await cluster.bind();
          this.log(`[FALLBACK-BIND] ✅ Bound ${clusterName}`);
          boundCount++;
        } catch (err) {
          // Silent fail - device may not support this cluster
        }
      }
    }

    this.log(`[FALLBACK-BIND] Bound ${boundCount} clusters`);
  }

  /**
   * Register ALL capabilities with automatic reporting
   * This ensures data flows from device to Homey automatically
   */
  async registerAllCapabilitiesWithReporting() {
    this.log('[REGISTER] 🔔 Registering all capabilities with automatic reporting...');

    // 🚨 CRITICAL: Check if this is a button/remote device
    const driverName = this.driver?.id || '';
    const isButtonDevice = (
      driverName.includes('button') ||
      driverName.includes('remote') ||
      driverName.includes('wireless') ||
      driverName.includes('scene')
    );

    // 🚨 CRITICAL: Check if this is a Tuya DP device (climate monitors, etc.)
    // v5.2.88: Use _isPureTuyaDP from constructor - this is the MOST reliable check
    // because it's based on model/manufacturer, not cluster presence
    const endpoint1 = this.zclNode?.endpoints?.[1];
    const hasTuyaCluster = !!(endpoint1?.clusters?.manuSpecificTuya || endpoint1?.clusters?.['0xEF00'] || endpoint1?.clusters?.tuya);
    const hasStandardClusters = !!(endpoint1?.clusters?.temperatureMeasurement || endpoint1?.clusters?.powerConfiguration);

    // v5.2.88: CRITICAL FIX - Use _isPureTuyaDP which detects TS0601/_TZE devices
    // These devices often advertise phantom ZCL clusters that don't respond!
    if (this._isPureTuyaDP) {
      this.log('[REGISTER] 🔶 PURE TUYA DP DEVICE DETECTED (_isPureTuyaDP=true)');
      this.log('[REGISTER] 🔶 Device uses Tuya DataPoint protocol (TS0601/_TZE)');
      this.log('[REGISTER] 🔶 Standard clusters may be phantom (advertised but don\'t respond)');
      this.log('[REGISTER] 🔶 Skipping ALL ZCL registration to avoid timeouts');
      this.log('[REGISTER] 🔶 Data will arrive via Tuya DP events from TuyaEF00Manager');
      return;
    }

    // Legacy check for devices not detected early
    if (hasTuyaCluster && !hasStandardClusters) {
      this.log('[REGISTER] 🔶 TUYA DP DEVICE DETECTED (cluster check)');
      this.log('[REGISTER] 🔶 Device uses Tuya DataPoint protocol, not standard Zigbee clusters');
      this.log('[REGISTER] 🔶 Skipping standard cluster registration (handled by driver-specific Tuya DP logic)');
      return;
    }

    if (isButtonDevice) {
      this.log('[REGISTER] 🔘 BUTTON/REMOTE DEVICE DETECTED');
      this.log('[REGISTER] 🔘 Buttons only need measure_battery capability');
      this.log('[REGISTER] 🔘 Skipping temperature, humidity, motion, etc. (buttons send commands, not sensor data)');

      // v5.5.34: Check if device uses Tuya DP for battery (skip ZCL entirely)
      if (this.skipZclBatteryPolling || this.usesTuyaDPBattery) {
        this.log('[REGISTER] 🔋 Device uses Tuya DP for battery - skipping ZCL battery registration');
        this.log('[REGISTER] ✅ Button registration complete (battery via Tuya DP)');
        return;
      }

      // For buttons, ONLY register battery if it exists
      if (this.hasCapability('measure_battery') && this.zclNode?.endpoints?.[1]?.clusters?.powerConfiguration) {
        try {
          const endpoint = this.zclNode.endpoints[1];
          this.log('[REGISTER] 🔋 Registering measure_battery for button...');

          // v5.5.21: Disable polling for battery buttons (they sleep and don't respond)
          await this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
            get: 'batteryPercentageRemaining',
            report: 'batteryPercentageRemaining',
            reportParser: async value => {
              const percent = Math.round(value / 2);
              this.log(`🔋 [BUTTON BATTERY] ${percent}% (raw: ${value})`);

              // Update alarm if exists
              if (this.hasCapability('alarm_battery')) {
                const threshold = this.getSetting('battery_low_threshold') || 20;
                const isLow = percent < threshold;
                await this.setCapabilityValue('alarm_battery', isLow).catch(() => { });
                this.log(`[BUTTON BATTERY] Alarm: ${isLow ? '⚠️ LOW' : '✅ OK'}`);
              }

              return percent;
            },
            getParser: value => Math.round(value / 2),
            // v5.5.21: DISABLE POLLING for battery buttons - they sleep!
            getOpts: {
              pollInterval: 0  // Disable polling completely
            },
            reportOpts: {
              configureAttributeReporting: {
                minInterval: 3600,    // 1 hour (buttons last long!)
                maxInterval: 65535,   // ~18 hours (max uint16 for Zigbee)
                minChange: 10         // 10% change
              }
            }
          });

          // v5.5.225: Try initial read in background (non-blocking) - may work if device just paired
          // If device is sleeping, we'll get battery when user presses a button
          setTimeout(async () => {
            try {
              this.log('[REGISTER] 🔋 Attempting background battery read...');
              const battery = await endpoint.clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining'])
                .catch(() => null);
              if (battery?.batteryPercentageRemaining != null && battery.batteryPercentageRemaining !== 255) {
                const percent = Math.round(battery.batteryPercentageRemaining / 2);
                if (this.hasCapability('measure_battery')) {
                  await this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(() => { });
                }
                await this.setStoreValue('last_battery_percentage', percent).catch(() => { });
                this.log(`[REGISTER] ✅ Initial battery: ${percent}%`);
              }
            } catch (e) {
              this.log('[REGISTER] ℹ️ Initial battery read skipped (device sleeping)');
            }
          }, 2000); // 2s delay to let device settle

          this.log('[REGISTER] ✅ Button battery configured (initial read in background)');
        } catch (err) {
          this.error('[REGISTER] ❌ Button battery registration failed:', err.message);
        }
      }

      this.log('[REGISTER] ✅ Button registration complete (battery only)');
      return;  // Exit immediately - buttons don't need other capabilities
    }

    this.log(`[REGISTER] zclNode available: ${!!this.zclNode}`);
    this.log(`[REGISTER] zclNode.endpoints available: ${!!this.zclNode?.endpoints}`);

    let registeredCount = 0;

    if (!this.zclNode) {
      this.error('[REGISTER] ❌ zclNode not available - cannot register capabilities');
      return;
    }

    let endpoint = this.zclNode.endpoints?.[1];

    if (!endpoint) {
      this.log('[REGISTER] ⚠️  Endpoint 1 not available');
      this.log(`[REGISTER] Available endpoints: ${Object.keys(this.zclNode.endpoints || {}).join(', ')}`);

      // Try to find ANY valid endpoint
      const availableEndpoints = Object.keys(this.zclNode.endpoints || {}).filter(ep => ep !== '0');
      if (availableEndpoints.length === 0) {
        this.error('[REGISTER] ❌ No endpoints available at all!');
        return;
      }

      // Use first available endpoint
      const firstEp = availableEndpoints[0];
      endpoint = this.zclNode.endpoints[firstEp];
      this.log(`[REGISTER] Using endpoint ${firstEp} instead`);
    }

    this.log(`[REGISTER] Endpoint clusters: ${Object.keys(endpoint?.clusters || {}).join(', ')}`);

    // 🧠 Get intelligent reporting intervals from IntelligentDataManager
    const dataConfig = this.intelligentDataManager?.config || null;
    const intervals = dataConfig?.intervals || {};

    // Determine device profile for interval optimization
    let profileMultiplier = 1;
    let maxReportsPerHour = 60;

    if (dataConfig && dataConfig.deviceProfiles) {
      if (this.powerType === 'BATTERY') {
        // Battery devices: 2x longer intervals to save power
        profileMultiplier = dataConfig.deviceProfiles.battery.multiplier || 2;
        maxReportsPerHour = dataConfig.deviceProfiles.battery.maxReportsPerHour || 10;
        this.log('[REGISTER] 🔋 Using BATTERY profile (2x longer intervals)');
      } else if (this.powerType === 'AC' || this.powerType === 'DC') {
        // AC/DC devices: normal intervals
        profileMultiplier = dataConfig.deviceProfiles.ac_powered.multiplier || 1;
        maxReportsPerHour = dataConfig.deviceProfiles.ac_powered.maxReportsPerHour || 60;
        this.log('[REGISTER] ⚡ Using AC/DC profile (normal intervals)');
      }
    }

    this.log(`[REGISTER] Interval multiplier: ${profileMultiplier}x | Max reports/hour: ${maxReportsPerHour}`);

    // BATTERY
    // v5.5.34: Skip ZCL battery registration for devices using Tuya DP battery
    if (this.hasCapability('measure_battery') && endpoint.clusters?.powerConfiguration && !this.skipZclBatteryPolling && !this.usesTuyaDPBattery) {
      try {
        this.log('[REGISTER] 🔋 Registering measure_battery...');
        await this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          // 🧠 Use BatteryManager for accurate calculation if voltage available
          reportParser: async value => {
            this.log(`🔋 [BATTERY] Raw value received: ${value}`);

            // Simple /2 conversion (Zigbee standard)
            const simplePercent = Math.round(value / 2);

            // Try to get voltage for more accurate calculation
            // v5.2.76: Add defensive check for calculatePercentageFromVoltage method
            if (this.batteryManager && this.batteryType &&
              typeof this.batteryManager.calculatePercentageFromVoltage === 'function') {
              try {
                // Voltage might be in store from previous read
                const storedVoltage = this.getStoreValue('batteryVoltage');
                if (storedVoltage) {
                  const accuratePercent = this.batteryManager.calculatePercentageFromVoltage(
                    storedVoltage / 10, // Convert to V
                    this.batteryType
                  );
                  if (accuratePercent !== null) {
                    this.log(`[BATTERY] 🧠 Accurate: ${accuratePercent}% (voltage-based) vs Simple: ${simplePercent}%`);

                    // Update alarm_battery if capability exists
                    if (this.hasCapability('alarm_battery')) {
                      const threshold = this.getSetting('battery_low_threshold') || 20;
                      const isLow = accuratePercent < threshold;
                      await this.setCapabilityValue('alarm_battery', isLow).catch(err =>
                        this.error('[BATTERY] Failed to update alarm:', err)
                      );
                      this.log(`[BATTERY] Alarm: ${isLow ? '⚠️ LOW' : '✅ OK'} (${accuratePercent}% vs ${threshold}%)`);
                    }

                    return Math.round(accuratePercent);
                  }
                }
              } catch (err) {
                this.error('[BATTERY] Voltage calculation error:', err);
                // Fallback to simple calculation
              }
            }

            this.log(`🔋 [BATTERY] Calculated: ${simplePercent}%`);

            // Update alarm_battery with simple percent if capability exists
            if (this.hasCapability('alarm_battery')) {
              const threshold = this.getSetting('battery_low_threshold') || 20;
              const isLow = simplePercent < threshold;
              await this.setCapabilityValue('alarm_battery', isLow).catch(err =>
                this.error('[BATTERY] Failed to update alarm:', err)
              );
              this.log(`[BATTERY] Alarm: ${isLow ? '⚠️ LOW' : '✅ OK'} (${simplePercent}% vs ${threshold}%)`);
            }

            return simplePercent;
          },
          getParser: value => Math.round(value / 2),
          reportOpts: {
            configureAttributeReporting: {
              minInterval: Math.min(65535, Math.round((intervals.battery?.min || 3600) * profileMultiplier)),
              maxInterval: Math.min(65535, Math.round((intervals.battery?.max || 43200) * profileMultiplier)), // Cap at uint16 max (65535)
              minChange: intervals.battery?.change || 5
            }
          }
        });

        // Force initial read - try to get both percentage AND voltage
        const batteryAttrs = await endpoint.clusters.powerConfiguration.readAttributes([
          'batteryPercentageRemaining',
          'batteryVoltage'
        ]).catch(() => null);

        if (batteryAttrs) {
          let finalPercent = 50; // Default

          // Store voltage for future accurate calculations
          if (batteryAttrs.batteryVoltage != null) {
            await this.setStoreValue('batteryVoltage', batteryAttrs.batteryVoltage);

            // Calculate accurate percentage from voltage using BatteryManager
            // v5.2.76: Add defensive check for calculatePercentageFromVoltage method
            if (this.batteryManager && this.batteryType &&
              typeof this.batteryManager.calculatePercentageFromVoltage === 'function') {
              const voltage = batteryAttrs.batteryVoltage / 10; // Convert to V
              const accuratePercent = this.batteryManager.calculatePercentageFromVoltage(voltage, this.batteryType);
              if (accuratePercent !== null) {
                finalPercent = Math.round(accuratePercent);
                this.log(`[REGISTER] 🧠 Battery: ${finalPercent}% (voltage: ${voltage}V, type: ${this.batteryType})`);
              }
            }
          }

          // Fallback to simple percentage if voltage-based calculation failed
          if (batteryAttrs.batteryPercentageRemaining != null && finalPercent === 50) {
            finalPercent = Math.round(batteryAttrs.batteryPercentageRemaining / 2);
            this.log(`[REGISTER] 🔋 Battery: ${finalPercent}% (simple calculation)`);
          }

          if (this.hasCapability('measure_battery')) {
            await this.setCapabilityValue('measure_battery', parseFloat(finalPercent));
            this.log(`[REGISTER] ✅ measure_battery = ${finalPercent}%`);
          }
          registeredCount++;
        }
      } catch (err) {
        this.error('[REGISTER] ❌ measure_battery failed:', err.message);
      }
    }

    // TEMPERATURE
    if (this.hasCapability('measure_temperature') && endpoint.clusters?.temperatureMeasurement) {
      try {
        this.log('[REGISTER] 🌡️  Registering measure_temperature...');
        await this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
          get: 'measuredValue',
          report: 'measuredValue',
          reportParser: value => Math.round((value / 100) * 10) / 10,
          getParser: value => Math.round((value / 100) * 10) / 10,
          reportOpts: {
            configureAttributeReporting: {
              minInterval: Math.round((intervals.temperature?.min || 60) * profileMultiplier),
              maxInterval: Math.round((intervals.temperature?.max || 3600) * profileMultiplier),
              minChange: Math.round((intervals.temperature?.change || 0.5) * 100)  // Convert to raw value
            }
          }
        });

        // Force initial read
        const temp = await endpoint.clusters.temperatureMeasurement.readAttributes(['measuredValue']).catch(() => null);
        if (temp?.measuredValue != null) {
          const temperature = Math.round((temp.measuredValue / 100) * 10) / 10;
          await this.setCapabilityValue('measure_temperature', parseFloat(temperature));
          this.log(`[REGISTER] ✅ measure_temperature = ${temperature}°C`);
          registeredCount++;
        }
      } catch (err) {
        this.error('[REGISTER] ❌ measure_temperature failed:', err.message);
      }
    }

    // HUMIDITY
    // v5.2.84: Check for both possible cluster names and use correct CLUSTER constant
    const humidityCluster = endpoint.clusters?.relativeHumidity || endpoint.clusters?.msRelativeHumidity;
    if (this.hasCapability('measure_humidity') && humidityCluster) {
      try {
        this.log('[REGISTER] 💧 Registering measure_humidity...');
        // v5.2.84: Use RELATIVE_HUMIDITY_MEASUREMENT if available, fallback to numeric cluster ID
        const clusterConstant = CLUSTER.RELATIVE_HUMIDITY_MEASUREMENT || CLUSTER.RELATIVE_HUMIDITY || 1029;
        await this.registerCapability('measure_humidity', clusterConstant, {
          get: 'measuredValue',
          report: 'measuredValue',
          reportParser: value => Math.round(value / 100),
          getParser: value => Math.round(value / 100),
          reportOpts: {
            configureAttributeReporting: {
              minInterval: Math.round((intervals.humidity?.min || 60) * profileMultiplier),
              maxInterval: Math.round((intervals.humidity?.max || 3600) * profileMultiplier),
              minChange: Math.round((intervals.humidity?.change || 5) * 100)  // Convert to raw value
            }
          }
        });

        // Force initial read - v5.2.84: Use the detected cluster variable
        const humid = await humidityCluster.readAttributes(['measuredValue']).catch(() => null);
        if (humid?.measuredValue != null) {
          const humidity = Math.round(humid.measuredValue / 100);
          await this.setCapabilityValue('measure_humidity', parseFloat(humidity));
          this.log(`[REGISTER] ✅ measure_humidity = ${humidity}%`);
          registeredCount++;
        }
      } catch (err) {
        this.error('[REGISTER] ❌ measure_humidity failed:', err.message);
      }
    }

    // LUMINANCE
    if (this.hasCapability('measure_luminance') && endpoint.clusters?.illuminanceMeasurement) {
      try {
        this.log('[REGISTER] ☀️  Registering measure_luminance...');
        await this.registerCapability('measure_luminance', CLUSTER.ILLUMINANCE_MEASUREMENT, {
          get: 'measuredValue',
          report: 'measuredValue',
          reportParser: value => Math.round(Math.pow(10, (value - 1) / 10000)),
          getParser: value => Math.round(Math.pow(10, (value - 1) / 10000)),
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 60,      // 1 min
              maxInterval: 3600,    // 1 hour
              minChange: 1000       // ~10 lux change
            }
          }
        });

        // Force initial read
        const lux = await endpoint.clusters.illuminanceMeasurement.readAttributes(['measuredValue']).catch(() => null);
        if (lux?.measuredValue != null) {
          const luminance = Math.round(Math.pow(10, (lux.measuredValue - 1) / 10000));
          await this.setCapabilityValue('measure_luminance', parseFloat(luminance));
          this.log(`[REGISTER] ✅ measure_luminance = ${luminance} lux`);
          registeredCount++;
        }
      } catch (err) {
        this.error('[REGISTER] ❌ measure_luminance failed:', err.message);
      }
    }

    // OCCUPANCY (Motion)
    if (this.hasCapability('alarm_motion') && endpoint.clusters?.occupancySensing) {
      try {
        this.log('[REGISTER] 🚶 Registering alarm_motion...');
        await this.registerCapability('alarm_motion', CLUSTER.OCCUPANCY_SENSING, {
          get: 'occupancy',
          report: 'occupancy',
          reportParser: value => (value & 1) === 1,
          getParser: value => (value & 1) === 1,
          reportOpts: {
            configureAttributeReporting: {
              minInterval: 0,        // Immediate
              maxInterval: 300,      // 5 min
              minChange: 1           // Any change
            }
          }
        });

        // Force initial read
        const occ = await endpoint.clusters.occupancySensing.readAttributes(['occupancy']).catch(() => null);
        if (occ?.occupancy != null) {
          const motion = (occ.occupancy & 1) === 1;
          await this.setCapabilityValue('alarm_motion', motion);
          this.log(`[REGISTER] ✅ alarm_motion = ${motion}`);
          registeredCount++;
        }
      } catch (err) {
        this.error('[REGISTER] ❌ alarm_motion failed:', err.message);
      }
    }

    // CONTACT (Door/Window)
    if (this.hasCapability('alarm_contact') && endpoint.clusters?.iasZone) {
      try {
        this.log('[REGISTER] 🚪 Registering alarm_contact...');
        // IAS Zone uses events, not reporting
        this.registerCapabilityListener('alarm_contact', async (value) => {
          this.log('[CONTACT] Value changed:', value);
        });

        // Force initial read
        const zone = await endpoint.clusters.iasZone.readAttributes(['zoneStatus']).catch(() => null);
        if (zone?.zoneStatus != null) {
          const open = (zone.zoneStatus & 1) === 1;
          await this.setCapabilityValue('alarm_contact', open);
          this.log(`[REGISTER] ✅ alarm_contact = ${open}`);
          registeredCount++;
        }
      } catch (err) {
        this.error('[REGISTER] ❌ alarm_contact failed:', err.message);
      }
    }

    this.log(`[REGISTER] ✅ Registered ${registeredCount} capabilities with automatic reporting`);
    this.log('[REGISTER] 🎯 Data will now flow automatically from device to Homey!');
  }

  /**
   * Configure standard Zigbee battery reporting (cluster 0x0001)
   * For devices with powerConfiguration cluster
   */
  async configureStandardBatteryReporting() {
    try {
      const endpoint = this.zclNode && this.zclNode.endpoints && this.zclNode.endpoints[1];
      if (!endpoint || !endpoint.clusters || !endpoint.clusters.powerConfiguration) {
        this.log('[BATTERY] No powerConfiguration cluster on endpoint 1');
        return;
      }

      this.log('[BATTERY] Configuring standard battery reporting (cluster 0x0001)...');

      // Setup listener FIRST (always succeeds)
      // v5.5.504: Check capability exists before setting (intelligent adapter may have removed it)
      endpoint.clusters.powerConfiguration.on('attr.batteryPercentageRemaining', value => {
        const percent = Math.round(value / 2); // 0–200 -> 0–100
        this.log('[BATTERY] batteryPercentageRemaining report:', value, '->', percent, '%');
        if (this.hasCapability('measure_battery')) {
          this.setCapabilityValue('measure_battery', parseFloat(percent)).catch(this.error);
        } else {
          this.log('[BATTERY] ⚠️ measure_battery capability not available (removed by adapter?)');
        }
      });

      // Try configureReporting but don't fail if device is sleepy
      try {
        await endpoint.clusters.powerConfiguration.configureReporting({
          batteryPercentageRemaining: {
            minInterval: 3600,   // 1h
            maxInterval: 43200,  // 12h
            minChange: 2         // 2 (=1%) en Zigbee scale 0-200
          },
        });
        this.log('[BATTERY] ✅ Standard battery reporting configured');
      } catch (configErr) {
        // Sleepy devices (buttons, sensors) often timeout
        // This is NORMAL - they'll send reports spontaneously
        this.log('[BATTERY] ⚠️ configureReporting failed (device sleepy?), but listener active');
        this.log('[BATTERY] Device will report battery when it wakes up');
      }
    } catch (err) {
      this.error('[BATTERY] Error setting up battery reporting:', err);
    }
  }

  /**
   * Called when device is added - sanitize name
   */
  async onAdded() {
    this.log('[ADDED] Device added, sanitizing name...');

    try {
      // Auto-sanitize device name (remove "(Hybrid)", "[Battery]", etc.)
      await TitleSanitizer.autoSanitizeDeviceName(this);

      this.log('[OK] Device name sanitized');
    } catch (err) {
      this.error('[SANITIZE] Error sanitizing device name:', err);
    }

    // Call parent onAdded if it exists
    if (super.onAdded && typeof super.onAdded === 'function') {
      try {
        await super.onAdded();
      } catch (err) {
        this.error('Parent onAdded failed:', err);
      }
    }
  }

  /**
   * Cleanup on device deletion
   */
  async onDeleted() {
    // v5.5.313: Mark device as deleted to prevent capability updates from async callbacks
    this._deleted = true;

    this.log('[CLEANUP] Device being removed...');

    try {
      // v5.3.50: CRITICAL - Cleanup cluster listeners to prevent memory leaks
      if (this._clusterListeners && this._clusterListeners.length > 0) {
        this.log(`[CLEANUP] Removing ${this._clusterListeners.length} cluster listeners...`);
        for (const listener of this._clusterListeners) {
          try {
            if (listener.cluster && typeof listener.cluster.removeListener === 'function') {
              listener.cluster.removeListener(listener.event, listener.handler);
              this.log(`[CLEANUP] ✅ Removed listener: ${listener.event}`);
            } else if (listener.cluster && typeof listener.cluster.off === 'function') {
              listener.cluster.off(listener.event, listener.handler);
              this.log(`[CLEANUP] ✅ Removed listener (off): ${listener.event}`);
            }
          } catch (err) {
            this.log(`[CLEANUP] ⚠️ Could not remove listener ${listener.event}: ${err.message}`);
          }
        }
        this._clusterListeners = [];
      }

      // Cleanup dynamic capability manager
      if (this.dynamicCapabilityManager && typeof this.dynamicCapabilityManager.cleanup === 'function') {
        this.dynamicCapabilityManager.cleanup();
      }

      // Cleanup IAS Zone enrollment
      if (this.iasZoneManager && typeof this.iasZoneManager.cleanup === 'function') {
        this.iasZoneManager.cleanup();
      }

      // Cleanup Tuya EF00
      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.cleanup === 'function') {
        this.tuyaEF00Manager.cleanup();
      }

      // Cleanup Multi-Endpoint manager
      if (this.multiEndpointManager && typeof this.multiEndpointManager.cleanup === 'function') {
        this.multiEndpointManager.cleanup();
      }

      // Cleanup command listener
      if (this.commandListener && typeof this.commandListener.cleanup === 'function') {
        this.commandListener.cleanup();
      }

      // Clear any pending timers
      if (this.dailySyncTimer) {
        clearTimeout(this.dailySyncTimer);
      }

      if (this.periodicReadTimer) {
        clearInterval(this.periodicReadTimer);
      }

      // v5.5.32: Cleanup DataRecoveryManager
      if (this._dataRecoveryManager && typeof this._dataRecoveryManager.destroy === 'function') {
        this._dataRecoveryManager.destroy();
        this._dataRecoveryManager = null;
      }

      // v5.5.33: Cleanup HybridDataQuery
      if (this._hybridDataQuery) {
        this._hybridDataQuery = null;
      }

      this.log('[OK] Device cleanup complete');
    } catch (err) {
      this.error('Device cleanup failed:', err);
    }

    // Call parent onDeleted if it exists and is a function
    if (super.onDeleted && typeof super.onDeleted === 'function') {
      try {
        await super.onDeleted();
      } catch (err) {
        this.error('Parent onDeleted failed:', err);
      }
    }
  }

  // ========================================================================
  // v5.2.9: DIAGNOSTICS
  // ========================================================================

  /**
   * Run full diagnostics on this device
   * Can be called from settings or via API
   * @returns {Object} Diagnostic results
   */
  async runDiagnostics() {
    if (!DeviceDiagnostics) {
      this.log('[DIAG] DeviceDiagnostics not available');
      return { error: 'Diagnostics module not loaded' };
    }

    try {
      const diagnostics = new DeviceDiagnostics(this);
      const results = await diagnostics.runFullDiagnostics();

      // Store results for later access
      await this.setStoreValue('last_diagnostics', {
        timestamp: Date.now(),
        results: results
      }).catch(() => { });

      return results;
    } catch (err) {
      this.error('[DIAG] Failed to run diagnostics:', err);
      return { error: err.message };
    }
  }

  /**
   * Get recommendations for fixing issues
   * @returns {Array} List of recommendations
   */
  async getRecommendations() {
    if (!DeviceDiagnostics) {
      return [];
    }

    try {
      const diagnostics = new DeviceDiagnostics(this);
      await diagnostics.runFullDiagnostics();
      return diagnostics.getRecommendations();
    } catch (err) {
      this.error('[DIAG] Failed to get recommendations:', err);
      return [];
    }
  }

  /**
   * Get device KPIs for monitoring
   * @returns {Object} KPI data
   */
  async getKPIs() {
    const kpis = {
      name: this.getName(),
      available: this.getAvailable(),
      lastSeen: await this.getStoreValue('last_seen').catch(() => null),
      capabilities: {}
    };

    // Collect capability values
    for (const cap of this.getCapabilities()) {
      try {
        kpis.capabilities[cap] = await this.getCapabilityValue(cap);
      } catch (e) {
        kpis.capabilities[cap] = null;
      }
    }

    // Battery info
    if (this.hasCapability('measure_battery')) {
      kpis.battery = {
        level: await this.getCapabilityValue('measure_battery').catch(() => null),
        lastUpdate: await this.getStoreValue('last_battery_update').catch(() => null)
      };
    }

    // Connectivity
    kpis.connectivity = {
      signalQuality: await this.getStoreValue('signal_quality').catch(() => null),
      lastCommunication: await this.getStoreValue('last_data_received').catch(() => null)
    };

    return kpis;
  }
}

// v5.5.855: Apply PeriodicAutoEnricherMixin for dynamic capability detection
Object.assign(BaseHybridDevice.prototype, PeriodicAutoEnricherMixin);

module.exports = BaseHybridDevice;
