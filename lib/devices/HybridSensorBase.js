'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaEF00Manager = require('../tuya/TuyaEF00Manager');
const { getAppVersionPrefixed } = require('../utils/AppVersion');
const greenPower = require('../green_power');
const UniversalDataHandler = require('../UniversalDataHandler');
const ProtocolAutoOptimizer = require('../ProtocolAutoOptimizer');
const {
  tuyaDataQuery,
  safeTuyaDataQuery,
  isSleepyEndDevice,
  updateRadioActivity,
  DP_PRESETS
} = require('../tuya/TuyaDataQuery');
const {
  syncDeviceTime,
  TuyaTimeSyncMixin
} = require('../tuya/TuyaTimeSync');
const { DataRecoveryManager } = require('../tuya/DataRecoveryManager');
const { HybridDataQuery, ZigbeeDataQuery } = require('../zigbee/ZigbeeDataQuery');
// v5.5.84: Universal parser for intelligent multi-format support
const {
  parseTuyaFrame,
  getUniversalDPMapping,
  setupUniversalZCLListeners,
  UNIVERSAL_DP_PATTERNS,
  UNIVERSAL_ZCL_CLUSTERS
} = require('../tuya/UniversalTuyaParser');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║           HybridSensorBase - Dynamic version from app.json                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  THE ULTIMATE SENSOR BASE CLASS                                              ║
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

  /** DP mappings for Tuya EF00 devices (override in subclass) */
  get dpMappings() {
    return {
      1: { capability: 'measure_temperature', divisor: 10 },
      2: { capability: 'measure_humidity', divisor: 10 },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  async onNodeInit({ zclNode }) {
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
    // STEP 0.5: v5.5.103 - Detect available clusters FIRST (Peter's fix)
    // This prevents trying to read non-existent clusters (causes timeouts)
    // ─────────────────────────────────────────────────────────────────────────
    this._detectAvailableClusters();

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Detect protocol
    // ─────────────────────────────────────────────────────────────────────────
    this._protocolInfo = this._detectProtocol();

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
    this.log('');
    this.log('📦 STEP 3: Initializing Universal Data Handler...');
    try {
      this.universalDataHandler = new UniversalDataHandler(this, { verbose: true });
      await this.universalDataHandler.initialize(zclNode);

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
          this.log(`   ${proto}: ${stats.received} messages`);
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
          await this.setCapabilityValue('measure_temperature', temp).catch(() => { });
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
          await this.setCapabilityValue('measure_humidity', hum).catch(() => { });
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
        await this.setCapabilityValue('measure_battery', percent).catch(() => { });
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
        await this.setCapabilityValue('measure_battery', percent).catch(() => { });
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
        await this.setCapabilityValue('measure_battery', percent).catch(() => { });
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
    for (const [proto, stats] of Object.entries(this._protocolStats)) {
      if (stats.received > 0) {
        this.log(`[HYBRID]   ✅ ${proto}: ${stats.received} messages received`);
      } else {
        this.log(`[HYBRID]   ⚪ ${proto}: no messages`);
      }
    }
    this.log('[HYBRID] ════════════════════════════════════════════════════════');
  }

  /**
   * Setup IAS Zone listeners for contact/motion/water/smoke sensors
   */
  async _setupIASZoneListeners(zclNode) {
    const endpoint = zclNode?.endpoints?.[1];
    const iasCluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;

    if (!iasCluster) return;

    this.log('[IAS] Setting up IAS Zone listeners...');

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
        this.log(`[IAS] 📥 Zone notification:`, data);
        if (data?.zoneStatus !== undefined) {
          this._handleIASZoneStatus(data.zoneStatus);
        }
      });
    }

    this.log('[IAS] ✅ IAS Zone listeners active');
  }

  /**
   * Handle IAS Zone status (contact, motion, water, smoke)
   */
  _handleIASZoneStatus(status) {
    const alarm1 = (status & 0x01) !== 0; // Bit 0: Zone alarm 1
    const alarm2 = (status & 0x02) !== 0; // Bit 1: Zone alarm 2
    const tamper = (status & 0x04) !== 0; // Bit 2: Tamper
    const battery = (status & 0x08) !== 0; // Bit 3: Battery low

    // Map to capabilities based on what's available
    if (this.hasCapability('alarm_contact')) {
      this._safeSetCapability('alarm_contact', alarm1);
    }
    if (this.hasCapability('alarm_motion')) {
      this._safeSetCapability('alarm_motion', alarm1);
    }
    if (this.hasCapability('alarm_water')) {
      this._safeSetCapability('alarm_water', alarm1);
    }
    if (this.hasCapability('alarm_smoke')) {
      this._safeSetCapability('alarm_smoke', alarm1);
    }
    if (this.hasCapability('alarm_tamper')) {
      this._safeSetCapability('alarm_tamper', tamper);
    }
    if (this.hasCapability('alarm_battery') && battery) {
      this._safeSetCapability('alarm_battery', battery);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROTOCOL DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  _detectProtocol() {
    try {
      const settings = this.getSettings?.() || {};
      const store = this.getStore?.() || {};
      const data = this.getData?.() || {};

      const modelId = settings.zb_modelId || store.modelId || data.modelId || '';
      const mfr = settings.zb_manufacturerName || store.manufacturerName || data.manufacturerName || '';

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
        const valueData = data.slice(offset + 4, offset + 4 + len);

        let value;
        if (type === 0x01) { // Bool
          value = valueData[0] !== 0;
        } else if (type === 0x02 && len === 4) { // Value (4-byte)
          value = valueData.readInt32BE(0);
        } else if (type === 0x04) { // Enum
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

    const dp = parseInt(dpId);

    // ═══════════════════════════════════════════════════════════════════════
    // v5.3.96: Handle special DPs that are common across ALL devices
    // ═══════════════════════════════════════════════════════════════════════
    this._handleCommonDP(dp, rawValue);

    const mapping = this.dpMappings[dp];

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

      this.log(`[DP] ℹ️ Unmapped DP${dp} = ${rawValue} (add to dpMappings for explicit handling)`);
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

    this.log(`[DP] DP${dp} → ${capability} = ${value}`);

    // Store value
    this._sensorValues[capability] = value;
    this._lastUpdate = Date.now();

    // Set capability
    this._safeSetCapability(capability, value);
  }

  _parseValue(raw) {
    // Buffer/Array
    if (Buffer.isBuffer(raw) || Array.isArray(raw)) {
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      if (buf.length === 1) return buf[0];
      if (buf.length === 2) return buf.readInt16BE(0);
      if (buf.length === 4) return buf.readInt32BE(0);
      return buf[0];
    }

    // Already a number
    if (typeof raw === 'number') return raw;

    // String number
    if (typeof raw === 'string') {
      const num = parseFloat(raw);
      return isNaN(num) ? raw : num;
    }

    // Boolean
    if (typeof raw === 'boolean') return raw ? 1 : 0;

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

    // Try via TuyaEF00Manager
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
   */
  _handleCommonDP(dp, rawValue) {
    const value = this._parseValue(rawValue);

    // ─────────────────────────────────────────────────────────────────────────
    // BUTTON PRESS DETECTION (various DPs used by different devices)
    // ─────────────────────────────────────────────────────────────────────────
    const buttonDPs = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 120, 121];
    if (buttonDPs.includes(dp) && (value === 0 || value === 1 || value === 2)) {
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
        this.log(`[BATTERY] 🔋 Battery: ${value}%`);
        this.setCapabilityValue('measure_battery', value).catch(() => { });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ILLUMINANCE (DP 12 or 103 common for radar sensors)
    // ─────────────────────────────────────────────────────────────────────────
    if ([12, 103].includes(dp) && this.hasCapability('measure_luminance')) {
      if (typeof value === 'number' && value >= 0) {
        this.log(`[LUX] ☀️ Illuminance: ${value} lux`);
        this.setCapabilityValue('measure_luminance', value).catch(() => { });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TARGET DISTANCE (DP 9 for radar sensors)
    // ─────────────────────────────────────────────────────────────────────────
    if (dp === 9 && this.hasCapability('measure_distance')) {
      const distance = typeof value === 'number' ? value / 100 : value; // cm to m
      this.log(`[RADAR] 📏 Target distance: ${distance}m`);
      this.setCapabilityValue('measure_distance', distance).catch(() => { });
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
  // SAFE CAPABILITY SETTER
  // ═══════════════════════════════════════════════════════════════════════════

  _safeSetCapability(capability, value) {
    if (!this.hasCapability(capability)) {
      this.log(`[CAP] ⚠️ Missing capability: ${capability}`);
      return;
    }

    // v5.5.28: Apply calibration offsets from settings
    const calibratedValue = this._applyCalibration(capability, value);

    this.setCapabilityValue(capability, calibratedValue).catch(err => {
      this.error(`[CAP] Error setting ${capability}:`, err.message);
    });
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
   */
  updateRadioActivity() {
    updateRadioActivity(this);

    // v5.5.33: Mark awake for hybrid queries
    if (this._hybridDataQuery) {
      this._hybridDataQuery.markAwake();
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

module.exports = HybridSensorBase;
