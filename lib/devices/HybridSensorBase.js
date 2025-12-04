'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaEF00Manager = require('../tuya/TuyaEF00Manager');
const UniversalDataHandler = require('../UniversalDataHandler');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║           HybridSensorBase - v5.3.85 PHANTOM FIX                             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  THE ULTIMATE SENSOR BASE CLASS                                              ║
 * ║                                                                              ║
 * ║  - Uses UniversalDataHandler for ALL data types                              ║
 * ║  - Uses TuyaEF00Manager as fallback                                          ║
 * ║  - MAXIMUM VERBOSE LOGGING                                                   ║
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
    // STEP 1: Detect protocol
    // ─────────────────────────────────────────────────────────────────────────
    this._protocolInfo = this._detectProtocol();

    this.log('');
    this.log('╔══════════════════════════════════════════════════════════════╗');
    this.log('║          HYBRID SENSOR BASE v5.3.85 PHANTOM FIX              ║');
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
    // STEP 3: Initialize UNIVERSAL DATA HANDLER (handles ALL data types)
    // ─────────────────────────────────────────────────────────────────────────
    this.log('');
    this.log('📦 STEP 3: Initializing Universal Data Handler...');
    try {
      this.universalDataHandler = new UniversalDataHandler(this, { verbose: true });
      await this.universalDataHandler.initialize(zclNode);

      // Listen to ALL events from UniversalDataHandler
      this.universalDataHandler.on('dp', (dpId, value, dataType) => {
        this.log(`[UDH→SENSOR] DP${dpId} received: ${value} (type: ${dataType})`);
        this._handleDP(dpId, value);
      });

      this.universalDataHandler.on('zcl', (cluster, attr, value) => {
        this.log(`[UDH→SENSOR] ZCL ${cluster}.${attr} received: ${value}`);
        this._handleZCLData(cluster, attr, value);
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

    this.log('[HYBRID-SENSOR] ✅ Initialization complete - TRUE HYBRID MODE');
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
  // CAPABILITY MIGRATION
  // ═══════════════════════════════════════════════════════════════════════════

  async _migrateCapabilities() {
    const requiredCaps = this.sensorCapabilities;

    for (const cap of requiredCaps) {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MAX LISTENERS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  _bumpMaxListeners(zclNode) {
    try {
      const max = this.maxListeners;

      if (!zclNode?.endpoints) return;

      for (const endpointId of Object.keys(zclNode.endpoints)) {
        const endpoint = zclNode.endpoints[endpointId];

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

      this.log(`[LISTENERS] ✅ MaxListeners set to ${max} on all clusters`);
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

    const dp = parseInt(dpId);

    // ═══════════════════════════════════════════════════════════════════════
    // v5.3.96: Handle special DPs that are common across ALL devices
    // ═══════════════════════════════════════════════════════════════════════
    this._handleCommonDP(dp, rawValue);

    const mapping = this.dpMappings[dp];

    if (!mapping) {
      this.log(`[DP] ℹ️ Unmapped DP${dp} = ${rawValue}`);
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
   * Send time sync directly to Tuya cluster
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
      const payload = Buffer.from([
        now.getFullYear() - 2000,
        now.getMonth() + 1,
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        Math.floor((now.getDay() + 6) % 7)
      ]);

      // Try setData method
      if (typeof tuyaCluster.setData === 'function') {
        await tuyaCluster.setData({
          status: 0,
          transid: Math.floor(Math.random() * 255),
          dp: 0x24, // Time sync DP
          datatype: 0x00,
          length_hi: 0,
          length_lo: payload.length,
          data: payload
        });
        this.log('[TIME-SYNC] ✅ Time sent:', now.toLocaleString());
      }
    } catch (err) {
      // Silent fail - device might not support time sync
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
      'iasZone.zoneStatus': 'alarm_contact'
    };

    const key = `${cluster}.${attr}`;
    const capability = zclMappings[key];

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

    this.log('[ZCL] ✅ ZCL setup complete');
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

      // Configure reporting
      if (typeof cluster.configureReporting === 'function') {
        cluster.configureReporting({
          [attribute]: { minInterval: 60, maxInterval: 3600, minChange: 1 }
        }).catch(() => { });
      }

      this.log(`[ZCL] ✅ ${capability} configured`);
    } catch (err) {
      this.log(`[ZCL] ⚠️ ${capability} setup failed:`, err.message);
    }
  }

  async _setupIASZone(clusters) {
    const iasCluster = clusters.iasZone || clusters.ssIasZone;
    if (!iasCluster) return;

    try {
      // Determine capability based on zone type
      let capability = 'alarm_contact'; // Default

      try {
        const attrs = await iasCluster.readAttributes(['zoneType']);
        const zoneType = attrs?.zoneType;

        if (zoneType === 0x000D) capability = 'alarm_motion';      // Motion
        else if (zoneType === 0x0015) capability = 'alarm_contact'; // Contact
        else if (zoneType === 0x002A) capability = 'alarm_water';   // Water
        else if (zoneType === 0x0028) capability = 'alarm_smoke';   // Smoke
      } catch (e) { }

      if (!this.hasCapability(capability)) {
        await this.addCapability(capability).catch(() => { });
      }

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
  // SAFE CAPABILITY SETTER
  // ═══════════════════════════════════════════════════════════════════════════

  _safeSetCapability(capability, value) {
    if (!this.hasCapability(capability)) {
      this.log(`[CAP] ⚠️ Missing capability: ${capability}`);
      return;
    }

    this.setCapabilityValue(capability, value).catch(err => {
      this.error(`[CAP] Error setting ${capability}:`, err.message);
    });
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
}

module.exports = HybridSensorBase;
