'use strict';

const EnrichedDPMappings = require('../tuya/EnrichedDPMappings');
const { TuyaProtocolParser, DataConverter, TUYA_DP_TYPE: DP_TYPES } = require('../utils/data');

/**
 * UniversalClusterBinder - v5.5.397
 *
 * Comprehensive cluster binding for BOTH Tuya DP (0xEF00) AND Zigbee ZCL clusters.
 *
 * CRITICAL DISTINCTION:
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ TUYA DEVICES (TS0601, _TZE200_*, _TZE204_*, _TZE284_*)                     │
 * ├────────────────────────────────────────────────────────────────────────────┤
 * │ - Use cluster 0xEF00 (61184) - Tuya Private Cluster                       │
 * │ - Data via DP (DataPoints) not ZCL attributes                             │
 * │ - tuyaCluster: Send commands TO device                                    │
 * │ - tuyaClusterBound (BoundCluster): Receive reports FROM device            │
 * │ - Commands: 0x00 (setDP), 0x01 (getDP/response), 0x02 (report), 0x24 (time)│
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌────────────────────────────────────────────────────────────────────────────┐
 * │ ZIGBEE ZCL DEVICES (TS0201, TS0203, _TZ3000_*)                             │
 * ├────────────────────────────────────────────────────────────────────────────┤
 * │ - Use standard ZCL clusters (genOnOff, msTemperature, etc.)               │
 * │ - Data via ZCL attributes and reports                                      │
 * │ - cluster: Read/write attributes, send commands                           │
 * │ - clusterBound (BoundCluster): Receive attribute reports                  │
 * │ - configureReporting() for automatic reports                              │
 * └────────────────────────────────────────────────────────────────────────────┘
 *
 * MANUFACTURER PATTERN DETECTION:
 * - _TZE200_*, _TZE204_*, _TZE284_ → Tuya DP protocol (TS0601)
 * - _TZ3000_*, _TZ3210_*, _TYZB01_ → ZCL standard (TS0201, TS0203, etc.)
 * - TS0601 model → Always Tuya DP
 * - TS0201, TS0203 models → Always ZCL
 *
 * Sources:
 * - Zigbee2MQTT tuya.ts: https://github.com/Koenkk/zigbee-herdsman-converters
 * - ZHA quirks: https://github.com/zigpy/zha-device-handlers
 * - Homey SDK3: https://apps-sdk-v3.developer.homey.app/
 */

const { EventEmitter } = require('events');

// ═══════════════════════════════════════════════════════════════════════════
// CLUSTER IDs - Numeric format (SDK3 requirement)
// ═══════════════════════════════════════════════════════════════════════════
const CLUSTER_IDS = {
  // Tuya Private
  TUYA_EF00: 0xEF00,          // 61184 - Tuya DP cluster

  // General
  BASIC: 0x0000,              // 0 - Device info
  POWER_CFG: 0x0001,          // 1 - Battery
  IDENTIFY: 0x0003,           // 3 - Identify
  GROUPS: 0x0004,             // 4 - Groups
  SCENES: 0x0005,             // 5 - Scenes
  ON_OFF: 0x0006,             // 6 - On/Off
  LEVEL_CONTROL: 0x0008,      // 8 - Dimming

  // Measurement
  TEMPERATURE: 0x0402,        // 1026 - Temperature
  PRESSURE: 0x0403,           // 1027 - Pressure
  HUMIDITY: 0x0405,           // 1029 - Humidity
  ILLUMINANCE: 0x0400,        // 1024 - Illuminance
  OCCUPANCY: 0x0406,          // 1030 - Occupancy

  // IAS
  IAS_ZONE: 0x0500,           // 1280 - IAS Zone
  IAS_ACE: 0x0501,            // 1281 - IAS ACE
  IAS_WD: 0x0502,             // 1282 - IAS WD

  // Electrical
  ELECTRICAL: 0x0B04,         // 2820 - Electrical measurement
  METERING: 0x0702,           // 1794 - Metering

  // Lighting
  COLOR_CONTROL: 0x0300,      // 768 - Color control

  // HVAC
  THERMOSTAT: 0x0201,         // 513 - Thermostat
  FAN_CONTROL: 0x0202,        // 514 - Fan control

  // Closures
  WINDOW_COVERING: 0x0102,    // 258 - Window covering
  DOOR_LOCK: 0x0101,          // 257 - Door lock

  // Time
  TIME: 0x000A,               // 10 - Time cluster
};

// ═══════════════════════════════════════════════════════════════════════════
// TUYA DP TYPES
// ═══════════════════════════════════════════════════════════════════════════
const TUYA_DP_TYPE = {
  RAW: 0x00,      // Raw bytes
  BOOL: 0x01,     // Boolean (1 byte)
  VALUE: 0x02,    // Integer (4 bytes BE)
  STRING: 0x03,   // String (variable)
  ENUM: 0x04,     // Enum (1 byte)
  BITMAP: 0x05,   // Bitmap (1/2/4 bytes)
};

// ═══════════════════════════════════════════════════════════════════════════
// TUYA COMMANDS
// ═══════════════════════════════════════════════════════════════════════════
const TUYA_CMD = {
  SET_DP: 0x00,           // Set datapoint value
  GET_DP: 0x01,           // Get datapoint (response uses same ID)
  DP_REPORT: 0x02,        // Device reports DP spontaneously
  QUERY_ALL: 0x03,        // Query all datapoints
  ACTIVE_STATUS: 0x06,    // Active status report
  TIME_SYNC: 0x24,        // Time synchronization
  GATEWAY_STATUS: 0x25,   // Gateway status
};

// ═══════════════════════════════════════════════════════════════════════════
// MANUFACTURER PATTERN DETECTION
// ═══════════════════════════════════════════════════════════════════════════
const PROTOCOL_PATTERNS = {
  // Tuya DP protocol (cluster 0xEF00)
  TUYA_DP: [
    /^_TZE200_/i,     // Tuya MCU v1
    /^_TZE204_/i,     // Tuya MCU v2
    /^_TZE284_/i,     // Tuya MCU v3 (newer)
    /^_TZE300_/i,     // Tuya MCU (rare)
    /^_TYST11_/i,     // Tuya legacy
    /^_TYST12_/i,     // Tuya legacy
  ],

  // ZCL standard protocol
  ZCL_STANDARD: [
    /^_TZ3000_/i,     // Standard Tuya Zigbee
    /^_TZ3210_/i,     // Standard Tuya v2
    /^_TZ3400_/i,     // Standard Tuya v3
    /^_TZ2000_/i,     // Legacy standard
    /^_TZ1800_/i,     // Legacy standard
    /^_TYZB01_/i,     // Tuya Zigbee v1
    /^_TYZB02_/i,     // Tuya Zigbee v2
    /^_tz3000_/i,     // Lowercase variant
    /^_tz3210_/i,     // Lowercase variant
    /^_tz3002_/i,     // Legacy variant
    /^_tz3040_/i,     // Newer variant
    /^_tzb210_/i,     // Legacy
  ],
};

// Model IDs that force protocol type
const MODEL_PROTOCOL_MAP = {
  'TS0601': 'TUYA_DP',
  'TS0001': 'ZCL_STANDARD',
  'TS0002': 'ZCL_STANDARD',
  'TS0003': 'ZCL_STANDARD',
  'TS0004': 'ZCL_STANDARD',
  'TS0006': 'ZCL_STANDARD',
  'TS011F': 'ZCL_STANDARD',
  'TS0011': 'ZCL_STANDARD',
  'TS0012': 'ZCL_STANDARD',
  'TS0013': 'ZCL_STANDARD',
  'TS0014': 'ZCL_STANDARD',
  'TS0041': 'ZCL_STANDARD',
  'TS0042': 'ZCL_STANDARD',
  'TS0043': 'ZCL_STANDARD',
  'TS0044': 'ZCL_STANDARD',
  'TS0121': 'ZCL_STANDARD',
  'TS0201': 'ZCL_STANDARD',
  'TS0202': 'ZCL_STANDARD',
  'TS0203': 'ZCL_STANDARD',
  'TS0204': 'ZCL_STANDARD',
  'TS0205': 'ZCL_STANDARD',
  'TS0207': 'ZCL_STANDARD',
  'TS0210': 'ZCL_STANDARD',
  'TS0215A': 'ZCL_STANDARD',
  'TS0216': 'ZCL_STANDARD',
  'TS0222': 'ZCL_STANDARD',
  'TS0301': 'ZCL_STANDARD',
  'TS0501A': 'ZCL_STANDARD',
  'TS0502A': 'ZCL_STANDARD',
  'TS0503A': 'ZCL_STANDARD',
  'TS0504A': 'ZCL_STANDARD',
  'TS0505A': 'ZCL_STANDARD',
  'TS0505B': 'ZCL_STANDARD',
  'TS110E': 'ZCL_STANDARD',
  'TS110F': 'ZCL_STANDARD',
  'TS130F': 'ZCL_STANDARD',
  // Additional models
  'TS004F': 'ZCL_STANDARD',
  'TS0046': 'ZCL_STANDARD',
  'TS0215': 'ZCL_STANDARD',
  'TS0601_thermostat': 'TUYA_DP',
  'TS0601_cover': 'TUYA_DP',
  'TS0601_dimmer': 'TUYA_DP',
  'TS0601_switch': 'TUYA_DP',
  'TS0601_valve': 'TUYA_DP',
  'TS0601_ir': 'TUYA_DP',
  'TS0601_sensor': 'TUYA_DP',
};

class UniversalClusterBinder extends EventEmitter {

  constructor(device) {
    super();
    this.device = device;
    this.zclNode = null;
    this.protocol = null;  // 'TUYA_DP' or 'ZCL_STANDARD'
    this.initialized = false;

    // Cluster references
    this.tuyaCluster = null;
    this.zclClusters = new Map();

    // DP cache for Tuya
    this.dpCache = new Map();
    this.seqNum = 0;
  }

  /**
   * Safe logging
   */
  log(...args) {
    if (this.device?.log) {
      this.device.log('[CLUSTER-BINDER]', ...args);
    }
  }

  /**
   * Initialize cluster bindings
   * MUST be called after zclNode is available
   */
  async initialize(zclNode) {
    if (this.initialized) return true;

    this.zclNode = zclNode;
    if (!zclNode?.endpoints) {
      this.log('⚠️ No endpoints available');
      return false;
    }

    // Detect protocol from device info
    this.protocol = this._detectProtocol();
    this.log(`📋 Detected protocol: ${this.protocol}`);

    // Bind appropriate clusters
    if (this.protocol === 'TUYA_DP') {
      await this._bindTuyaCluster();
    } else {
      await this._bindZclClusters();
    }

    this.initialized = true;
    return true;
  }

  /**
   * Detect protocol based on manufacturer name and model ID
   */
  _detectProtocol() {
    const mfr = this._getManufacturer();
    const model = this._getModelId();

    this.log(`📋 Manufacturer: ${mfr}, Model: ${model}`);

    // Check model ID first (most reliable)
    if (model && MODEL_PROTOCOL_MAP[model.toUpperCase()]) {
      return MODEL_PROTOCOL_MAP[model.toUpperCase()];
    }

    // Check manufacturer patterns
    for (const pattern of PROTOCOL_PATTERNS.TUYA_DP) {
      if (pattern.test(mfr)) {
        return 'TUYA_DP';
      }
    }

    for (const pattern of PROTOCOL_PATTERNS.ZCL_STANDARD) {
      if (pattern.test(mfr)) {
        return 'ZCL_STANDARD';
      }
    }

    // Check if 0xEF00 cluster exists
    const ep1 = this.zclNode?.endpoints?.[1];
    if (ep1?.clusters) {
      const hasTuya = this._findCluster(ep1, CLUSTER_IDS.TUYA_EF00);
      if (hasTuya) {
        return 'TUYA_DP';
      }
    }

    // Default to ZCL
    return 'ZCL_STANDARD';
  }

  /**
   * Get manufacturer name from device
   */
  _getManufacturer() {
    try {
      return this.device.getSetting?.('zb_mfr_name')
        || this.device.getStoreValue?.('manufacturerName')
        || this.zclNode?.endpoints?.[1]?.clusters?.basic?.manufacturerName
        || '';
    } catch {
      return '';
    }
  }

  /**
   * Get model ID from device
   */
  _getModelId() {
    try {
      return this.device.getSetting?.('zb_model_id')
        || this.device.getStoreValue?.('modelId')
        || this.zclNode?.endpoints?.[1]?.clusters?.basic?.modelId
        || '';
    } catch {
      return '';
    }
  }

  /**
   * Find cluster with various naming conventions
   */
  _findCluster(endpoint, clusterId) {
    if (!endpoint?.clusters) return null;

    const clusters = endpoint.clusters;

    // Tuya cluster special handling
    if (clusterId === CLUSTER_IDS.TUYA_EF00) {
      return clusters.tuya
        || clusters.tuyaSpecific
        || clusters.tuyaManufacturer
        || clusters.manuSpecificTuya
        || clusters[0xEF00]
        || clusters['0xEF00']
        || clusters[61184]
        || clusters['61184'];
    }

    // Standard ZCL clusters
    return clusters[clusterId]
      || clusters[clusterId.toString()]
      || clusters[`0x${clusterId.toString(16).padStart(4, '0')}`];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TUYA DP CLUSTER BINDING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Bind Tuya 0xEF00 cluster
   */
  async _bindTuyaCluster() {
    const ep1 = this.zclNode.endpoints?.[1];
    if (!ep1) {
      this.log('⚠️ No endpoint 1 for Tuya cluster');
      return false;
    }

    // Find Tuya cluster
    this.tuyaCluster = this._findCluster(ep1, CLUSTER_IDS.TUYA_EF00);

    if (!this.tuyaCluster) {
      this.log('⚠️ Tuya cluster 0xEF00 not found');
      this.log('📋 Available clusters:', Object.keys(ep1.clusters || {}));

      // Try to bind directly
      try {
        if (typeof ep1.bind === 'function') {
          await ep1.bind(CLUSTER_IDS.TUYA_EF00).catch(() => { });
          this.tuyaCluster = this._findCluster(ep1, CLUSTER_IDS.TUYA_EF00);
        }
      } catch (e) {
        this.log('⚠️ Direct bind failed:', e.message);
      }
    }

    if (this.tuyaCluster) {
      this.log('✅ Tuya cluster found and bound');
      await this._setupTuyaListeners();
      return true;
    }

    this.log('⚠️ Tuya cluster not available - passive mode');
    return false;
  }

  /**
   * Setup Tuya cluster listeners
   */
  async _setupTuyaListeners() {
    if (!this.tuyaCluster) return;

    try {
      // Method 1: 'response' event (most common in Homey)
      if (typeof this.tuyaCluster.on === 'function') {
        this.tuyaCluster.on('response', (status, transId, dp, dataType, data) => {
          this.log(`📥 Tuya response: DP${dp}=${JSON.stringify(data)}`);
          this._handleTuyaDP(dp, dataType, data);
        });

        this.tuyaCluster.on('dataReport', (data) => {
          this.log('📥 Tuya dataReport:', JSON.stringify(data));
          this._parseTuyaReport(data);
        });

        this.log('✅ Tuya response listener registered');
      }

      // Method 2: BoundCluster registration
      try {
        const TuyaBoundCluster = require('./TuyaBoundCluster');
        ep1.bind(CLUSTER_IDS.TUYA_EF00, new TuyaBoundCluster({
          device: this.device,
          onDataReport: (data) => this._parseTuyaReport(data),
          onDataResponse: (data) => this._parseTuyaReport(data),
          onMcuSyncTime: () => this.emit('timeRequest'),
        }));
        this.log('✅ TuyaBoundCluster registered');
      } catch (e) {
        // BoundCluster may not be available
      }

    } catch (err) {
      this.log('⚠️ Tuya listener setup error:', err.message);
    }
  }

  /**
   * Handle Tuya DP value with enriched mapping
   */
  _handleTuyaDP(dp, dataType, value) {
    const mfr = this._getManufacturer();

    // Parse with enriched mappings if available
    const parsed = EnrichedDPMappings.parseDP(mfr, dp, value);

    this.dpCache.set(dp, {
      value: parsed.value,
      rawValue: value,
      type: dataType,
      capability: parsed.capability,
      name: parsed.name,
      timestamp: Date.now()
    });

    this.emit('dp', {
      dp,
      type: dataType,
      value: parsed.value,
      rawValue: value,
      capability: parsed.capability,
      name: parsed.name
    });
    this.emit(`dp-${dp}`, parsed.value);

    // If capability mapped, emit capability event
    if (parsed.capability) {
      this.emit('capability', { capability: parsed.capability, value: parsed.value });
    }
  }

  /**
   * Parse Tuya report payload - uses modular TuyaProtocolParser
   */
  _parseTuyaReport(payload) {
    if (!payload) return;

    // If already parsed with datapoints array
    if (payload.datapoints) {
      for (const dp of payload.datapoints) {
        this._handleTuyaDP(dp.dp, dp.dataType, dp.value);
      }
      return;
    }

    // Parse dpValues using various formats
    const dpValues = payload.dpValues || payload.data;
    if (!dpValues) return;

    // Try using modular parser for buffer data
    const buffer = DataConverter.toBuffer(dpValues);
    if (buffer.length >= 5 && TuyaProtocolParser.isTuyaFrame(buffer)) {
      const frame = TuyaProtocolParser.parseFrame(buffer);
      if (frame.valid) {
        for (const dp of frame.dps) {
          this._handleTuyaDP(dp.id, dp.type, dp.value);
        }
        return;
      }
    }

    // Handle array of DP objects
    if (Array.isArray(dpValues)) {
      for (const dp of dpValues) {
        if (typeof dp === 'object') {
          this._handleTuyaDP(dp.dp, dp.datatype || dp.dataType, this._parseValue(dp.data, dp.datatype));
        }
      }
      return;
    }

    // Fallback: Parse raw buffer manually [dp:1][type:1][len:2][data:len]...
    let offset = 0;
    while (offset + 4 <= buffer.length) {
      const dp = buffer.readUInt8(offset);
      const dataType = buffer.readUInt8(offset + 1);
      const len = buffer.readUInt16BE(offset + 2);

      if (offset + 4 + len > buffer.length) break;

      const data = buffer.slice(offset + 4, offset + 4 + len);
      const value = this._parseValue(data, dataType);

      this._handleTuyaDP(dp, dataType, value);
      offset += 4 + len;
    }
  }

  /**
   * Parse value based on Tuya DP type
   */
  _parseValue(data, dataType) {
    if (!Buffer.isBuffer(data)) return data;

    switch (dataType) {
      case TUYA_DP_TYPE.BOOL:
        return data.readUInt8(0) === 1;
      case TUYA_DP_TYPE.VALUE:
        if (data.length >= 4) return data.readInt32BE(0);
        if (data.length >= 2) return data.readInt16BE(0);
        return data.readUInt8(0);
      case TUYA_DP_TYPE.STRING:
        return data.toString('utf8');
      case TUYA_DP_TYPE.ENUM:
        return data.readUInt8(0);
      case TUYA_DP_TYPE.BITMAP:
        if (data.length >= 4) return data.readUInt32BE(0);
        if (data.length >= 2) return data.readUInt16BE(0);
        return data.readUInt8(0);
      default:
        return data;
    }
  }

  /**
   * Set Tuya DP value - uses modular TuyaProtocolParser
   */
  async setTuyaDP(dp, value, type = TUYA_DP_TYPE.VALUE) {
    if (!this.tuyaCluster) {
      throw new Error('Tuya cluster not available');
    }

    // Use modular builder
    const payload = TuyaProtocolParser.buildDP(dp, type, value);

    this.log(`📤 Setting DP${dp} = ${value}`);

    // Try different send methods
    if (typeof this.tuyaCluster.dataRequest === 'function') {
      return await this.tuyaCluster.dataRequest({
        status: 0,
        transid: this.seqNum++,
        dp,
        datatype: type,
        length_hi: (dataBuffer.length >> 8) & 0xFF,
        length_lo: dataBuffer.length & 0xFF,
        data: dataBuffer,
      });
    }

    if (typeof this.tuyaCluster.command === 'function') {
      return await this.tuyaCluster.command(TUYA_CMD.SET_DP, payload);
    }

    throw new Error('No send method available');
  }

  /**
   * Encode value for Tuya DP
   */
  _encodeValue(value, type) {
    switch (type) {
      case TUYA_DP_TYPE.BOOL:
        return Buffer.from([value ? 1 : 0]);
      case TUYA_DP_TYPE.VALUE: {
        const buf = Buffer.alloc(4);
        buf.writeInt32BE(Number(value), 0);
        return buf;
      }
      case TUYA_DP_TYPE.STRING:
        return Buffer.from(String(value), 'utf8');
      case TUYA_DP_TYPE.ENUM:
        return Buffer.from([Number(value)]);
      default:
        return Buffer.isBuffer(value) ? value : Buffer.from([Number(value)]);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZCL STANDARD CLUSTER BINDING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Bind ZCL standard clusters
   */
  async _bindZclClusters() {
    const ep1 = this.zclNode.endpoints?.[1];
    if (!ep1?.clusters) {
      this.log('⚠️ No clusters on endpoint 1');
      return;
    }

    // Bind common clusters
    const commonClusters = [
      { id: CLUSTER_IDS.ON_OFF, name: 'genOnOff' },
      { id: CLUSTER_IDS.LEVEL_CONTROL, name: 'genLevelCtrl' },
      { id: CLUSTER_IDS.POWER_CFG, name: 'genPowerCfg' },
      { id: CLUSTER_IDS.TEMPERATURE, name: 'msTemperatureMeasurement' },
      { id: CLUSTER_IDS.HUMIDITY, name: 'msRelativeHumidity' },
      { id: CLUSTER_IDS.ILLUMINANCE, name: 'msIlluminanceMeasurement' },
      { id: CLUSTER_IDS.OCCUPANCY, name: 'msOccupancySensing' },
      { id: CLUSTER_IDS.IAS_ZONE, name: 'ssIasZone' },
      { id: CLUSTER_IDS.ELECTRICAL, name: 'haElectricalMeasurement' },
      { id: CLUSTER_IDS.METERING, name: 'seMetering' },
      { id: CLUSTER_IDS.THERMOSTAT, name: 'hvacThermostat' },
      { id: CLUSTER_IDS.WINDOW_COVERING, name: 'closuresWindowCovering' },
      { id: CLUSTER_IDS.COLOR_CONTROL, name: 'lightingColorCtrl' },
    ];

    for (const { id, name } of commonClusters) {
      const cluster = this._findCluster(ep1, id) || ep1.clusters[name];
      if (cluster) {
        this.zclClusters.set(id, cluster);
        await this._bindAndConfigure(cluster, id, name);
      }
    }

    this.log(`✅ Bound ${this.zclClusters.size} ZCL clusters`);
  }

  /**
   * Bind and configure reporting for a ZCL cluster
   */
  async _bindAndConfigure(cluster, clusterId, clusterName) {
    try {
      // Bind cluster
      if (typeof cluster.bind === 'function') {
        await cluster.bind().catch(() => { });
      }

      // Setup attribute report listener
      if (typeof cluster.on === 'function') {
        cluster.on('attr', (attr, value) => {
          this.log(`📥 ${clusterName}: ${attr} = ${value}`);
          this.emit('zclAttr', { cluster: clusterId, attr, value });
          this.emit(`${clusterName}-${attr}`, value);
        });
      }

      this.log(`✅ Bound cluster ${clusterName} (${clusterId})`);
    } catch (err) {
      this.log(`⚠️ Cluster ${clusterName} bind error:`, err.message);
    }
  }

  /**
   * Get ZCL cluster
   */
  getZclCluster(clusterId) {
    return this.zclClusters.get(clusterId);
  }

  /**
   * Read ZCL attribute
   */
  async readZclAttribute(clusterId, attribute) {
    const cluster = this.zclClusters.get(clusterId);
    if (!cluster) {
      throw new Error(`Cluster ${clusterId} not bound`);
    }

    if (typeof cluster.readAttributes === 'function') {
      const result = await cluster.readAttributes([attribute]);
      return result[attribute];
    }

    throw new Error('readAttributes not available');
  }

  /**
   * Write ZCL attribute
   */
  async writeZclAttribute(clusterId, attribute, value) {
    const cluster = this.zclClusters.get(clusterId);
    if (!cluster) {
      throw new Error(`Cluster ${clusterId} not bound`);
    }

    if (typeof cluster.writeAttributes === 'function') {
      return await cluster.writeAttributes({ [attribute]: value });
    }

    throw new Error('writeAttributes not available');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get cached DP value (Tuya)
   */
  getCachedDP(dp) {
    return this.dpCache.get(dp)?.value;
  }

  /**
   * Get full cached DP info (Tuya)
   */
  getCachedDPInfo(dp) {
    return this.dpCache.get(dp);
  }

  /**
   * Get all DPs for current manufacturer
   */
  getManufacturerDPs() {
    return EnrichedDPMappings.getDPsForManufacturer(this._getManufacturer());
  }

  /**
   * Get device type based on manufacturer
   */
  getDeviceTypeFromManufacturer() {
    return EnrichedDPMappings.getDeviceType(this._getManufacturer());
  }

  /**
   * Check protocol type
   */
  isTuyaDP() {
    return this.protocol === 'TUYA_DP';
  }

  isZclStandard() {
    return this.protocol === 'ZCL_STANDARD';
  }

  /**
   * Get protocol type
   */
  getProtocol() {
    return this.protocol;
  }
}

// Export constants
UniversalClusterBinder.CLUSTER_IDS = CLUSTER_IDS;
UniversalClusterBinder.TUYA_DP_TYPE = TUYA_DP_TYPE;
UniversalClusterBinder.TUYA_CMD = TUYA_CMD;
UniversalClusterBinder.PROTOCOL_PATTERNS = PROTOCOL_PATTERNS;
UniversalClusterBinder.MODEL_PROTOCOL_MAP = MODEL_PROTOCOL_MAP;

module.exports = UniversalClusterBinder;
