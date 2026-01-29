'use strict';

const { EventEmitter } = require('events');
const greenPower = require('./green_power');

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║              UNIVERSAL DATA HANDLER v5.3.73                                   ║
 * ║                                                                               ║
 * ║  THE ULTIMATE SOLUTION for handling ANY data from ANY source:                ║
 * ║  - Tuya DP (cluster 0xEF00)                                                  ║
 * ║  - Standard ZCL clusters                                                      ║
 * ║  - Raw Zigbee frames                                                          ║
 * ║  - Custom manufacturer clusters                                               ║
 * ║  - ANY data format (Buffer, Array, Object, String, Number, etc.)             ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  - MAXIMUM VERBOSE LOGGING (every step, every byte, every event)             ║
 * ║  - Multiple fallback strategies (simple → complex)                           ║
 * ║  - Intelligent auto-detection                                                 ║
 * ║  - Autonomous and dynamic                                                     ║
 * ║  - Phantom device prevention                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

class UniversalDataHandler extends EventEmitter {

  constructor(device, options = {}) {
    super();
    this.device = device;
    this.options = {
      verbose: true,
      maxListeners: 100,
      ...options
    };

    // Statistics
    this.stats = {
      initialized: false,
      dataReceived: 0,
      tuyaDPReceived: 0,
      zclDataReceived: 0,
      rawFramesReceived: 0,
      parseErrors: 0,
      lastDataTimestamp: null,
      dpValues: {},
      clusterValues: {}
    };

    // Registered handlers
    this._dpHandlers = new Map();
    this._clusterHandlers = new Map();
    this._rawHandlers = [];

    // Increase max listeners
    this.setMaxListeners(this.options.maxListeners);

    this._log('╔══════════════════════════════════════════════════════════════╗');
    this._log('║       UNIVERSAL DATA HANDLER - CREATED                       ║');
    this._log('╚══════════════════════════════════════════════════════════════╝');
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOGGING (MAXIMUM VERBOSITY)
  // ═══════════════════════════════════════════════════════════════════════════════

  _log(message, ...args) {
    if (this.device?.log) {
      this.device.log(`[UDH] ${message}`, ...args);
    } else {
      console.log(`[UDH] ${message}`, ...args);
    }
  }

  _logData(stage, data, extra = {}) {
    const dataType = this._getDataType(data);
    const preview = this._getDataPreview(data);

    this._log('┌─────────────────────────────────────────────────────────────┐');
    this._log(`│ 📥 DATA RECEIVED - Stage: ${stage.padEnd(20)}`);
    this._log('├─────────────────────────────────────────────────────────────┤');
    this._log(`│ Type:     ${dataType}`);
    this._log(`│ Preview:  ${preview}`);
    if (extra.dpId !== undefined) this._log(`│ DP ID:    ${extra.dpId}`);
    if (extra.cluster !== undefined) this._log(`│ Cluster:  ${extra.cluster}`);
    if (extra.endpoint !== undefined) this._log(`│ Endpoint: ${extra.endpoint}`);
    if (extra.event !== undefined) this._log(`│ Event:    ${extra.event}`);
    this._log(`│ Time:     ${new Date().toISOString()}`);
    this._log('└─────────────────────────────────────────────────────────────┘');
  }

  _logError(message, error) {
    this._log(`❌ ERROR: ${message}`);
    if (error) this._log(`   Details: ${error.message || error}`);
    this.stats.parseErrors++;
  }

  _getDataType(data) {
    if (data === null) return 'null';
    if (data === undefined) return 'undefined';
    if (Buffer.isBuffer(data)) return `Buffer[${data.length}]`;
    if (Array.isArray(data)) return `Array[${data.length}]`;
    if (typeof data === 'object') {
      const keys = Object.keys(data).slice(0, 5).join(', ');
      return `Object{${keys}${Object.keys(data).length > 5 ? '...' : ''}}`;
    }
    return typeof data;
  }

  _getDataPreview(data, maxLen = 100) {
    try {
      if (data === null || data === undefined) return String(data);
      if (Buffer.isBuffer(data)) return data.toString('hex').substring(0, maxLen);
      if (typeof data === 'object') return JSON.stringify(data).substring(0, maxLen);
      return String(data).substring(0, maxLen);
    } catch (e) {
      return '[Unable to preview]';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  async initialize(zclNode) {
    this._log('🔍 [DIAGNOSTIC-MASSIF-UDH] ═══════════════════════════════════════');
    this._log('🔍 [DIAGNOSTIC-MASSIF-UDH] UniversalDataHandler.initialize() APPELÉ');
    this._log(`🔍 [DIAGNOSTIC-MASSIF-UDH] Device: ${this.device?.getName?.()}`);
    this._log(`🔍 [DIAGNOSTIC-MASSIF-UDH] zclNode: ${zclNode ? 'PRÉSENT' : 'NULL'}`);
    this._log(`🔍 [DIAGNOSTIC-MASSIF-UDH] Device capabilities: ${JSON.stringify(this.device?.getCapabilities?.())}`);
    this._log(`🔍 [DIAGNOSTIC-MASSIF-UDH] Device available: ${this.device?.getAvailable?.()}`);
    this._log('🔍 [DIAGNOSTIC-MASSIF-UDH] ═══════════════════════════════════════');

    this._log('');
    this._log('╔══════════════════════════════════════════════════════════════╗');
    this._log('║       🚀 UNIVERSAL DATA HANDLER - INITIALIZING               ║');
    this._log('╚══════════════════════════════════════════════════════════════╝');

    if (!zclNode) {
      this._logError('No zclNode provided to initialize()');
      return false;
    }

    this.zclNode = zclNode;

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Detect device info
    // ─────────────────────────────────────────────────────────────────────────
    this._log('');
    this._log('📋 STEP 1: Device Detection');
    const deviceInfo = this._detectDeviceInfo();
    this._log(`   Model:        ${deviceInfo.modelId}`);
    this._log(`   Manufacturer: ${deviceInfo.manufacturer}`);
    this._log(`   Protocol:     ${deviceInfo.protocol}`);
    this._log(`   Is Tuya DP:   ${deviceInfo.isTuyaDP}`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Discover endpoints
    // ─────────────────────────────────────────────────────────────────────────
    this._log('');
    this._log('📋 STEP 2: Endpoint Discovery');
    const endpoints = this._discoverEndpoints(zclNode);
    this._log(`   Found ${endpoints.length} endpoints: ${endpoints.join(', ')}`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Discover clusters
    // ─────────────────────────────────────────────────────────────────────────
    this._log('');
    this._log('📋 STEP 3: Cluster Discovery');
    for (const epId of endpoints) {
      const clusters = this._discoverClusters(zclNode, epId);
      this._log(`   Endpoint ${epId}: ${clusters.join(', ') || '(none)'}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Setup listeners for ALL data sources
    // ─────────────────────────────────────────────────────────────────────────
    this._log('');
    this._log('📋 STEP 4: Setting up Universal Listeners');

    // 4a: Tuya cluster listeners
    await this._setupTuyaListeners(zclNode);

    // 4b: Standard ZCL listeners
    await this._setupZCLListeners(zclNode);

    // 4c: Raw frame listeners
    await this._setupRawFrameListeners(zclNode);

    // 4d: Endpoint-level listeners
    await this._setupEndpointListeners(zclNode);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Setup max listeners to prevent warnings
    // ─────────────────────────────────────────────────────────────────────────
    this._log('');
    this._log('📋 STEP 5: MaxListeners Configuration');
    this._bumpMaxListeners(zclNode);

    // ─────────────────────────────────────────────────────────────────────────
    // DONE
    // ─────────────────────────────────────────────────────────────────────────
    this.stats.initialized = true;
    this._log('');
    this._log('╔══════════════════════════════════════════════════════════════╗');
    this._log('║       ✅ INITIALIZATION COMPLETE                             ║');
    this._log('╚══════════════════════════════════════════════════════════════╝');
    this._log('');

    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DEVICE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════════

  _detectDeviceInfo() {
    const settings = this.device?.getSettings?.() || {};
    const store = this.device?.getStore?.() || {};
    const data = this.device?.getData?.() || {};

    const modelId = settings.zb_modelId || store.modelId || data.modelId || 'unknown';
    const manufacturer = settings.zb_manufacturerName || store.manufacturerName || data.manufacturerName || 'unknown';

    // Protocol detection (case-insensitive)
    const mfrLower = (manufacturer || '').toLowerCase();
    const modelLower = (modelId || '').toLowerCase();
    const isTuyaDP = modelLower === 'ts0601' || mfrLower.startsWith('_tze');
    const isStandardZCL = modelLower.startsWith('ts02') || mfrLower === 'sonoff' || mfrLower === 'ewelink';

    return {
      modelId,
      manufacturer,
      protocol: isTuyaDP ? 'TUYA_DP' : (isStandardZCL ? 'ZCL' : 'HYBRID'),
      isTuyaDP,
      isStandardZCL
    };
  }

  _discoverEndpoints(zclNode) {
    if (!zclNode?.endpoints) return [];
    // v5.5.57: Filter out Green Power and utility endpoints
    const usable = greenPower.getUsableEndpoints(zclNode);
    return usable.map(e => e.id);
  }

  _discoverClusters(zclNode, endpointId) {
    const endpoint = zclNode?.endpoints?.[endpointId];
    if (!endpoint?.clusters) return [];
    return Object.keys(endpoint.clusters);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TUYA LISTENERS (MULTIPLE METHODS)
  // ═══════════════════════════════════════════════════════════════════════════════

  async _setupTuyaListeners(zclNode) {
    this._log('   🔷 Setting up Tuya listeners...');

    const endpoint = zclNode?.endpoints?.[1];
    if (!endpoint?.clusters) {
      this._log('   ⚠️ No clusters on endpoint 1');
      return;
    }

    // Try all possible Tuya cluster names
    const tuyaClusterNames = [
      'tuya', 'manuSpecificTuya', 'tuyaSpecific', 'tuyaManufacturer',
      '61184', 61184, '0xEF00', 0xEF00
    ];

    let tuyaCluster = null;
    let foundName = null;

    for (const name of tuyaClusterNames) {
      if (endpoint.clusters[name]) {
        tuyaCluster = endpoint.clusters[name];
        foundName = name;
        break;
      }
    }

    if (!tuyaCluster) {
      this._log('   ⚠️ Tuya cluster not found');
      this._log(`   Available clusters: ${Object.keys(endpoint.clusters).join(', ')}`);
      return;
    }

    this._log(`   ✅ Tuya cluster found: ${foundName}`);

    // Register ALL possible event types
    const eventTypes = [
      'dp', 'datapoint', 'dataReport', 'report', 'reporting',
      'response', 'data', 'command', 'notification'
    ];

    for (const eventType of eventTypes) {
      if (typeof tuyaCluster.on === 'function') {
        try {
          tuyaCluster.on(eventType, (data) => {
            this._logData('TUYA_CLUSTER', data, { event: eventType });
            this._handleTuyaData(data, eventType);
          });
          this._log(`   ✅ Listener registered: tuya.on('${eventType}')`);
        } catch (e) {
          this._log(`   ⚠️ Failed to register: tuya.on('${eventType}'): ${e.message}`);
        }
      }
    }

    // Also try to listen for attribute reports
    if (tuyaCluster.on) {
      const attrEvents = ['attr', 'attrs', 'attributes'];
      for (const attr of attrEvents) {
        try {
          tuyaCluster.on(attr, (data) => {
            this._logData('TUYA_ATTR', data, { event: attr });
            this._handleTuyaData(data, attr);
          });
        } catch (e) { }
      }
    }

    this._tuyaCluster = tuyaCluster;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ZCL LISTENERS (ALL STANDARD CLUSTERS)
  // ═══════════════════════════════════════════════════════════════════════════════

  async _setupZCLListeners(zclNode) {
    this._log('   🔷 Setting up ZCL listeners...');

    const standardClusters = {
      // Measurement clusters
      temperatureMeasurement: { attr: 'measuredValue', capability: 'measure_temperature', divisor: 100 },
      msTemperatureMeasurement: { attr: 'measuredValue', capability: 'measure_temperature', divisor: 100 },
      relativeHumidity: { attr: 'measuredValue', capability: 'measure_humidity', divisor: 100 },
      msRelativeHumidity: { attr: 'measuredValue', capability: 'measure_humidity', divisor: 100 },
      illuminanceMeasurement: { attr: 'measuredValue', capability: 'measure_luminance', transform: (v) => Math.round(Math.pow(10, (v - 1) / 10000)) },
      msIlluminanceMeasurement: { attr: 'measuredValue', capability: 'measure_luminance', transform: (v) => Math.round(Math.pow(10, (v - 1) / 10000)) },

      // Power
      powerConfiguration: { attr: 'batteryPercentageRemaining', capability: 'measure_battery', divisor: 2 },
      genPowerCfg: { attr: 'batteryPercentageRemaining', capability: 'measure_battery', divisor: 2 },

      // On/Off
      onOff: { attr: 'onOff', capability: 'onoff', transform: (v) => Boolean(v) },
      genOnOff: { attr: 'onOff', capability: 'onoff', transform: (v) => Boolean(v) },

      // Level
      levelControl: { attr: 'currentLevel', capability: 'dim', divisor: 254 },
      genLevelCtrl: { attr: 'currentLevel', capability: 'dim', divisor: 254 },

      // Occupancy
      occupancySensing: { attr: 'occupancy', capability: 'alarm_motion', transform: (v) => v > 0 },
      msOccupancySensing: { attr: 'occupancy', capability: 'alarm_motion', transform: (v) => v > 0 },

      // IAS Zone - v5.5.1: Dynamic capability based on device type
      iasZone: { attr: 'zoneStatus', capability: 'auto_ias', transform: (v) => (v & 1) !== 0 },
      ssIasZone: { attr: 'zoneStatus', capability: 'auto_ias', transform: (v) => (v & 1) !== 0 }
    };

    // v5.5.57: Filter out Green Power and utility endpoints
    const usableEndpoints = greenPower.getUsableEndpoints(zclNode);
    this._log(`   📋 Usable endpoints: [${usableEndpoints.map(e => e.id).join(', ')}]`);

    for (const { id: epId, endpoint } of usableEndpoints) {
      if (!endpoint?.clusters) continue;

      for (const [clusterName, config] of Object.entries(standardClusters)) {
        const cluster = endpoint.clusters[clusterName];
        if (!cluster) continue;

        this._log(`   ✅ Found cluster: ${clusterName} on endpoint ${epId}`);

        // Listen to attribute changes
        if (typeof cluster.on === 'function') {
          // v5.5.1: Resolve auto_ias capability based on device capabilities
          let resolvedConfig = { ...config };
          if (config.capability === 'auto_ias') {
            // Check which alarm capability the device has
            if (this.device.hasCapability('alarm_motion')) {
              resolvedConfig.capability = 'alarm_motion';
              this._log('   🔄 IAS Zone mapped to alarm_motion (motion sensor)');
            } else if (this.device.hasCapability('alarm_contact')) {
              resolvedConfig.capability = 'alarm_contact';
              this._log('   🔄 IAS Zone mapped to alarm_contact (contact sensor)');
            } else if (this.device.hasCapability('alarm_water')) {
              resolvedConfig.capability = 'alarm_water';
              this._log('   🔄 IAS Zone mapped to alarm_water (water sensor)');
            } else if (this.device.hasCapability('alarm_smoke')) {
              resolvedConfig.capability = 'alarm_smoke';
              this._log('   🔄 IAS Zone mapped to alarm_smoke (smoke sensor)');
            } else {
              // Default to alarm_motion for generic sensors
              resolvedConfig.capability = 'alarm_motion';
              this._log('   🔄 IAS Zone mapped to alarm_motion (default)');
            }
          }

          cluster.on(`attr.${config.attr}`, (value) => {
            this._logData('ZCL_ATTR', value, {
              cluster: clusterName,
              attr: config.attr,
              endpoint: epId
            });
            this._handleZCLAttribute(clusterName, config.attr, value, resolvedConfig);
          });
          this._log(`   ✅ Listener: ${clusterName}.on('attr.${config.attr}')`);
        }

        // Also listen to general report events
        const reportEvents = ['report', 'reporting', 'attributes'];
        for (const evt of reportEvents) {
          if (typeof cluster.on === 'function') {
            try {
              cluster.on(evt, (data) => {
                this._logData('ZCL_REPORT', data, {
                  cluster: clusterName,
                  event: evt,
                  endpoint: epId
                });
                this._handleZCLReport(clusterName, data, config);
              });
            } catch (e) { }
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RAW FRAME LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════════

  async _setupRawFrameListeners(zclNode) {
    this._log('   🔷 Setting up raw frame listeners...');

    // v5.5.57: Filter out Green Power and utility endpoints
    const usableEndpoints = greenPower.getUsableEndpoints(zclNode);

    for (const { id: epId, endpoint } of usableEndpoints) {
      if (typeof endpoint?.on === 'function') {
        try {
          endpoint.on('frame', (frame) => {
            this._logData('RAW_FRAME', frame, { endpoint: epId });
            this._handleRawFrame(frame, epId);
          });
          this._log(`   ✅ Listener: endpoint[${epId}].on('frame')`);
        } catch (e) {
          this._log(`   ⚠️ Failed: endpoint[${epId}].on('frame'): ${e.message}`);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ENDPOINT-LEVEL LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════════

  async _setupEndpointListeners(zclNode) {
    this._log('   🔷 Setting up endpoint-level listeners...');

    // Listen to zclNode itself for any global events
    if (typeof zclNode.on === 'function') {
      const globalEvents = ['frame', 'data', 'response', 'message'];
      for (const evt of globalEvents) {
        try {
          zclNode.on(evt, (data) => {
            this._logData('ZCLNODE', data, { event: evt });
            this._handleGlobalEvent(data, evt);
          });
          this._log(`   ✅ Listener: zclNode.on('${evt}')`);
        } catch (e) { }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAX LISTENERS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  _bumpMaxListeners(zclNode) {
    const max = this.options.maxListeners;
    let bumped = 0;

    // Bump zclNode
    if (typeof zclNode?.setMaxListeners === 'function') {
      zclNode.setMaxListeners(max);
      bumped++;
    }

    // Bump all usable endpoints and clusters (v5.5.57: exclude Green Power)
    const usableEndpoints = greenPower.getUsableEndpoints(zclNode);
    for (const { id: epId, endpoint } of usableEndpoints) {
      if (typeof endpoint?.setMaxListeners === 'function') {
        endpoint.setMaxListeners(max);
        bumped++;
      }

      for (const cluster of Object.values(endpoint?.clusters || {})) {
        if (typeof cluster?.setMaxListeners === 'function') {
          cluster.setMaxListeners(max);
          bumped++;
        }
      }
    }

    this._log(`   ✅ MaxListeners set to ${max} on ${bumped} objects`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════

  _handleTuyaData(data, eventType) {
    this.stats.tuyaDPReceived++;
    this.stats.dataReceived++;
    this.stats.lastDataTimestamp = Date.now();

    // Parse data using multiple strategies
    const parsed = this._parseTuyaData(data);

    if (parsed && parsed.length > 0) {
      for (const dp of parsed) {
        this._log(`   ✅ Parsed DP${dp.dpId} = ${dp.value} (type: ${dp.dataType})`);
        this.stats.dpValues[dp.dpId] = { value: dp.value, timestamp: Date.now() };

        // Emit events
        this.emit('dp', dp.dpId, dp.value, dp.dataType);
        this.emit(`dp-${dp.dpId}`, dp.value);
        this.emit('dpReport', { dpId: dp.dpId, value: dp.value, dataType: dp.dataType });
      }
    }
  }

  _handleZCLAttribute(clusterName, attrName, value, config) {
    this.stats.zclDataReceived++;
    this.stats.dataReceived++;
    this.stats.lastDataTimestamp = Date.now();

    // Transform value if needed
    let finalValue = value;
    if (config.divisor) finalValue = value / config.divisor;
    if (config.transform) finalValue = config.transform(value);

    this._log(`   ✅ ZCL ${clusterName}.${attrName} = ${finalValue}`);
    this.stats.clusterValues[`${clusterName}.${attrName}`] = { value: finalValue, timestamp: Date.now() };

    // Emit events
    this.emit('zcl', clusterName, attrName, finalValue);
    this.emit(`zcl-${clusterName}`, attrName, finalValue);
    if (config.capability) {
      this.emit('capability', config.capability, finalValue);
    }
  }

  _handleZCLReport(clusterName, data, config) {
    // Try to extract values from various report formats
    if (data && typeof data === 'object') {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number' || typeof value === 'boolean') {
          this._handleZCLAttribute(clusterName, key, value, config);
        }
      }
    }
  }

  _handleRawFrame(frame, endpointId) {
    this.stats.rawFramesReceived++;
    this.stats.dataReceived++;

    // Check if it's a Tuya frame
    if (frame.cluster === 0xEF00 || frame.cluster === 61184) {
      this._log(`   📦 Tuya raw frame on endpoint ${endpointId}`);
      if (frame.data) {
        const parsed = this._parseTuyaRawFrame(frame.data);
        if (parsed) {
          for (const dp of parsed) {
            this.emit('dp', dp.dpId, dp.value, dp.dataType);
            this.emit(`dp-${dp.dpId}`, dp.value);
          }
        }
      }
    }
  }

  _handleGlobalEvent(data, eventType) {
    this._log(`   📡 Global event '${eventType}' received`);
    // Try to parse as Tuya data
    const parsed = this._parseTuyaData(data);
    if (parsed && parsed.length > 0) {
      this._handleTuyaData(data, eventType);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TUYA DATA PARSING (MULTIPLE STRATEGIES)
  // ═══════════════════════════════════════════════════════════════════════════════

  _parseTuyaData(data) {
    const results = [];

    // Strategy 1: Direct { dp, data } format
    if (data?.dp !== undefined && data?.data !== undefined) {
      results.push({
        dpId: data.dp,
        value: this._parseValue(data.data),
        dataType: data.datatype || 'unknown'
      });
      return results;
    }

    // Strategy 2: { dpId, dpValue } format
    if (data?.dpId !== undefined) {
      results.push({
        dpId: data.dpId,
        value: this._parseValue(data.dpValue || data.data || data.value),
        dataType: data.dpType || 'unknown'
      });
      return results;
    }

    // Strategy 3: Array of datapoints
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item?.dp !== undefined) {
          results.push({
            dpId: item.dp,
            value: this._parseValue(item.data || item.value),
            dataType: item.datatype || 'unknown'
          });
        }
      }
      return results;
    }

    // Strategy 4: { datapoints: [...] } format
    if (data?.datapoints && Array.isArray(data.datapoints)) {
      for (const item of data.datapoints) {
        results.push({
          dpId: item.dp || item.dpId,
          value: this._parseValue(item.data || item.value),
          dataType: item.datatype || item.dataType || 'unknown'
        });
      }
      return results;
    }

    // Strategy 5: Try to parse as raw Tuya frame
    if (Buffer.isBuffer(data)) {
      return this._parseTuyaRawFrame(data);
    }

    return results;
  }

  _parseTuyaRawFrame(buffer) {
    const results = [];
    if (!buffer || buffer.length < 6) return results;

    try {
      // Tuya frame format: [status][transid][dp][type][len_hi][len_lo][data...]
      let offset = 2; // Skip status and transid

      while (offset < buffer.length - 4) {
        const dp = buffer[offset];
        const type = buffer[offset + 1];
        const len = (buffer[offset + 2] << 8) | buffer[offset + 3];

        if (offset + 4 + len > buffer.length) break;

        const valueData = buffer.slice(offset + 4, offset + 4 + len);
        let value;

        switch (type) {
        case 0x00: // RAW
          value = valueData;
          break;
        case 0x01: // BOOL
          value = valueData[0] !== 0;
          break;
        case 0x02: // VALUE (4-byte integer)
          value = len === 4 ? valueData.readInt32BE(0) :
            len === 2 ? valueData.readInt16BE(0) :
              valueData[0];
          break;
        case 0x03: // STRING
          value = valueData.toString('utf8');
          break;
        case 0x04: // ENUM
          value = valueData[0];
          break;
        case 0x05: // BITMAP
          value = len === 4 ? valueData.readUInt32BE(0) :
            len === 2 ? valueData.readUInt16BE(0) :
              valueData[0];
          break;
        default:
          value = valueData;
        }

        results.push({
          dpId: dp,
          value: value,
          dataType: ['raw', 'bool', 'value', 'string', 'enum', 'bitmap'][type] || 'unknown'
        });

        offset += 4 + len;
      }
    } catch (e) {
      this._logError('Tuya frame parse error', e);
    }

    return results;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // VALUE PARSING (ALL TYPES)
  // ═══════════════════════════════════════════════════════════════════════════════

  _parseValue(data) {
    if (data === null || data === undefined) return null;
    if (typeof data === 'number') return data;
    if (typeof data === 'boolean') return data;
    if (typeof data === 'string') return this._parseStringValue(data);
    if (Buffer.isBuffer(data)) return this._parseBufferValue(data);
    if (Array.isArray(data)) return this._parseArrayValue(data);
    if (typeof data === 'object') return this._parseObjectValue(data);
    return data;
  }

  _parseStringValue(str) {
    // Try number
    const num = parseFloat(str);
    if (!isNaN(num) && isFinite(num)) return num;

    // Try boolean
    const lower = str.toLowerCase();
    if (lower === 'true' || lower === 'on') return true;
    if (lower === 'false' || lower === 'off') return false;

    // Try hex
    if (str.startsWith('0x')) {
      const hex = parseInt(str, 16);
      if (!isNaN(hex)) return hex;
    }

    return str;
  }

  _parseBufferValue(buffer) {
    if (buffer.length === 0) return null;
    if (buffer.length === 1) return buffer[0];
    if (buffer.length === 2) return buffer.readInt16BE(0);
    if (buffer.length === 4) return buffer.readInt32BE(0);
    return Array.from(buffer);
  }

  _parseArrayValue(arr) {
    // If all bytes, convert to number
    if (arr.every(v => typeof v === 'number' && v >= 0 && v <= 255)) {
      const buffer = Buffer.from(arr);
      return this._parseBufferValue(buffer);
    }
    return arr;
  }

  _parseObjectValue(obj) {
    // Extract value from common patterns
    if (obj.value !== undefined) return this._parseValue(obj.value);
    if (obj.data !== undefined) return this._parseValue(obj.data);
    if (obj.dpValue !== undefined) return this._parseValue(obj.dpValue);
    return obj;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Register a handler for a specific DP
   */
  onDP(dpId, handler) {
    this._dpHandlers.set(dpId, handler);
    this.on(`dp-${dpId}`, handler);
    this._log(`📌 Registered handler for DP${dpId}`);
  }

  /**
   * Register a handler for a specific cluster attribute
   */
  onCluster(clusterName, attrName, handler) {
    const key = `${clusterName}.${attrName}`;
    this._clusterHandlers.set(key, handler);
    this._log(`📌 Registered handler for ${key}`);
  }

  /**
   * Get current statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get last known value for a DP
   */
  getDPValue(dpId) {
    return this.stats.dpValues[dpId]?.value;
  }

  /**
   * Get last known value for a cluster attribute
   */
  getClusterValue(clusterName, attrName) {
    const key = `${clusterName}.${attrName}`;
    return this.stats.clusterValues[key]?.value;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // UNKNOWN DP FALLBACK HANDLER (v5.5.648)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Register fallback handler for unknown/unregistered DPs
   * This enables automatic learning and logging of new device patterns
   */
  onUnknownDP(handler) {
    this._unknownDPHandler = handler;
    this._log('📌 Registered fallback handler for unknown DPs');
  }

  /**
   * Get all learned DP patterns from this session
   */
  getLearnedPatterns() {
    return {
      dpValues: { ...this.stats.dpValues },
      clusterValues: { ...this.stats.clusterValues },
      unknownDPs: { ...this._unknownDPs },
      deviceInfo: this._detectDeviceInfo()
    };
  }

  /**
   * Export device profile for automatic driver generation
   */
  exportDeviceProfile() {
    const info = this._detectDeviceInfo();
    const patterns = this.getLearnedPatterns();
    
    return {
      manufacturer: info.manufacturer,
      model: info.modelId,
      protocol: info.protocol,
      timestamp: new Date().toISOString(),
      dps: Object.entries(patterns.dpValues).map(([dp, data]) => ({
        dp: parseInt(dp),
        lastValue: data.value,
        inferredType: this._inferDPType(data.value)
      })),
      clusters: Object.keys(patterns.clusterValues)
    };
  }

  _inferDPType(value) {
    if (typeof value === 'boolean') return 'bool';
    if (typeof value === 'number') {
      if (Number.isInteger(value) && value >= 0 && value <= 255) return 'enum';
      return 'value';
    }
    if (typeof value === 'string') return 'string';
    if (Buffer.isBuffer(value) || Array.isArray(value)) return 'raw';
    return 'unknown';
  }
}

module.exports = UniversalDataHandler;
