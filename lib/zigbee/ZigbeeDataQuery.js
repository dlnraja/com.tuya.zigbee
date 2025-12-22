'use strict';

/**
 * ZigbeeDataQuery - v5.5.33 Zigbee-native Data Query
 *
 * PHILOSOPHY: TRUE HYBRID - Query data via BOTH Tuya DP AND ZCL
 *
 * PROBLEM: Some devices use ZCL for some data and Tuya DP for others
 * SOLUTION: Query BOTH protocols and merge results
 *
 * Sources:
 * - zigbee2mqtt: https://github.com/Koenkk/zigbee2mqtt
 * - ZHA (Home Assistant): https://github.com/zigpy/zha-device-handlers
 * - Hubitat: Community drivers for Tuya devices
 *
 * SLEEPY DEVICE HANDLING:
 * - Zigbee sleepy end devices (SEDs) wake briefly to send data
 * - We must query DURING this wake window
 * - configureReporting() tells device to report automatically
 * - readAttributes() only works when device is awake
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const ZCL_CLUSTERS = {
  // Basic
  genBasic: 0x0000,
  powerConfiguration: 0x0001,
  deviceTemperature: 0x0002,
  identify: 0x0003,
  groups: 0x0004,
  scenes: 0x0005,
  onOff: 0x0006,
  levelControl: 0x0008,

  // Measurement
  temperatureMeasurement: 0x0402,
  pressureMeasurement: 0x0403,
  flowMeasurement: 0x0404,
  relativeHumidityMeasurement: 0x0405,
  occupancySensing: 0x0406,
  illuminanceMeasurement: 0x0400,

  // Security
  iasZone: 0x0500,
  iasAce: 0x0501,
  iasWd: 0x0502,

  // HVAC
  thermostat: 0x0201,
  fanControl: 0x0202,

  // Tuya
  tuyaEF00: 0xEF00,
};

// Cluster to capability mapping
const CLUSTER_CAPABILITY_MAP = {
  temperatureMeasurement: {
    capability: 'measure_temperature',
    attribute: 'measuredValue',
    transform: (v) => v / 100,
  },
  relativeHumidityMeasurement: {
    capability: 'measure_humidity',
    attribute: 'measuredValue',
    transform: (v) => v / 100,
  },
  illuminanceMeasurement: {
    capability: 'measure_luminance',
    attribute: 'measuredValue',
    transform: (v) => {
      // ZCL uses log scale: lux = 10^((measuredValue-1)/10000)
      if (v === 0) return 0;
      if (v < 10000) return v; // Already in lux
      return Math.round(Math.pow(10, (v - 1) / 10000));
    },
  },
  occupancySensing: {
    capability: 'alarm_motion',
    attribute: 'occupancy',
    transform: (v) => (v & 1) !== 0,
  },
  powerConfiguration: {
    capability: 'measure_battery',
    attribute: 'batteryPercentageRemaining',
    transform: (v) => Math.round(v / 2),
  },
  iasZone: {
    capability: 'alarm_motion', // or alarm_contact, alarm_water, etc.
    attribute: 'zoneStatus',
    transform: (v) => (v & 1) !== 0,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ZIGBEE DATA QUERY CLASS
// ═══════════════════════════════════════════════════════════════════════════

class ZigbeeDataQuery {
  constructor(device) {
    this.device = device;
    this._lastWakeTime = null;
    this._isAwake = false;
    this._wakeWindowMs = 10000; // 10 second wake window
    this._pendingQueries = [];
  }

  log(msg) {
    this.device.log?.(`[ZCL-QUERY] ${msg}`);
  }

  /**
   * Mark device as awake (call when receiving ANY data)
   */
  markAwake() {
    this._lastWakeTime = Date.now();
    this._isAwake = true;
    this.log('📡 Device wake detected');

    // Process any pending queries
    this._processPendingQueries();

    // Auto-mark as sleeping after wake window
    setTimeout(() => {
      this._isAwake = false;
      this.log('💤 Device assumed sleeping');
    }, this._wakeWindowMs);
  }

  /**
   * Check if device is currently awake
   */
  isAwake() {
    if (!this._lastWakeTime) return false;
    return (Date.now() - this._lastWakeTime) < this._wakeWindowMs;
  }

  /**
   * Queue a query to execute when device wakes
   */
  queueQuery(queryFn) {
    this._pendingQueries.push(queryFn);
    this.log(`📋 Query queued (${this._pendingQueries.length} pending)`);
  }

  /**
   * Process pending queries
   */
  async _processPendingQueries() {
    if (this._pendingQueries.length === 0) return;

    this.log(`⚡ Processing ${this._pendingQueries.length} pending queries...`);

    const queries = [...this._pendingQueries];
    this._pendingQueries = [];

    for (const queryFn of queries) {
      try {
        await queryFn();
        await new Promise(r => setTimeout(r, 100)); // Small delay between queries
      } catch (err) {
        this.log(`⚠️ Query failed: ${err.message}`);
      }
    }
  }

  /**
   * Read all available ZCL attributes
   * @param {Object} options - Query options
   */
  async queryAllAttributes(options = {}) {
    const { endpoint = 1, timeout = 5000 } = options;

    this.log('📊 Querying all ZCL attributes...');

    const zclNode = this.device.zclNode;
    if (!zclNode?.endpoints?.[endpoint]) {
      this.log('⚠️ No endpoint available');
      return {};
    }

    const ep = zclNode.endpoints[endpoint];
    const results = {};

    // Query each mapped cluster
    for (const [clusterName, mapping] of Object.entries(CLUSTER_CAPABILITY_MAP)) {
      const cluster = ep.clusters?.[clusterName];
      if (!cluster || !cluster.readAttributes) continue;

      // Skip if device doesn't have the capability
      if (!this.device.hasCapability(mapping.capability)) continue;

      try {
        this.log(`📖 Reading ${clusterName}.${mapping.attribute}...`);

        const data = await Promise.race([
          cluster.readAttributes([mapping.attribute]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeout)
          )
        ]);

        if (data?.[mapping.attribute] != null) {
          const rawValue = data[mapping.attribute];
          const value = mapping.transform(rawValue);

          results[mapping.capability] = {
            raw: rawValue,
            value: value,
            cluster: clusterName,
          };

          this.log(`✅ ${mapping.capability}: raw=${rawValue} → ${value}`);

          // Set capability value
          await this.device.setCapabilityValue(mapping.capability, value).catch(() => { });
        }
      } catch (err) {
        this.log(`⚠️ ${clusterName} read failed: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Configure attribute reporting for automatic updates
   * This is the KEY to getting data from sleepy devices!
   */
  async configureAllReporting(options = {}) {
    const { endpoint = 1 } = options;

    this.log('📊 Configuring ZCL attribute reporting...');

    const zclNode = this.device.zclNode;
    if (!zclNode?.endpoints?.[endpoint]) {
      this.log('⚠️ No endpoint available');
      return;
    }

    const ep = zclNode.endpoints[endpoint];
    const reportingConfigs = [];

    // Temperature reporting
    if (ep.clusters?.temperatureMeasurement?.configureReporting) {
      try {
        await ep.clusters.temperatureMeasurement.configureReporting({
          measuredValue: {
            minInterval: 30,      // Min 30 seconds
            maxInterval: 3600,    // Max 1 hour
            minChange: 10,        // 0.1°C change
          },
        });
        reportingConfigs.push('temperature');
        this.log('✅ Temperature reporting configured');
      } catch (err) {
        this.log(`⚠️ Temperature reporting failed: ${err.message}`);
      }
    }

    // Humidity reporting
    if (ep.clusters?.relativeHumidityMeasurement?.configureReporting) {
      try {
        await ep.clusters.relativeHumidityMeasurement.configureReporting({
          measuredValue: {
            minInterval: 30,
            maxInterval: 3600,
            minChange: 100,       // 1% change
          },
        });
        reportingConfigs.push('humidity');
        this.log('✅ Humidity reporting configured');
      } catch (err) {
        this.log(`⚠️ Humidity reporting failed: ${err.message}`);
      }
    }

    // Illuminance reporting
    if (ep.clusters?.illuminanceMeasurement?.configureReporting) {
      try {
        await ep.clusters.illuminanceMeasurement.configureReporting({
          measuredValue: {
            minInterval: 10,      // Min 10 seconds
            maxInterval: 300,     // Max 5 minutes
            minChange: 1,         // Any change
          },
        });
        reportingConfigs.push('illuminance');
        this.log('✅ Illuminance reporting configured');
      } catch (err) {
        this.log(`⚠️ Illuminance reporting failed: ${err.message}`);
      }
    }

    // Occupancy reporting
    if (ep.clusters?.occupancySensing?.configureReporting) {
      try {
        await ep.clusters.occupancySensing.configureReporting({
          occupancy: {
            minInterval: 0,       // Immediate
            maxInterval: 3600,
            minChange: 1,
          },
        });
        reportingConfigs.push('occupancy');
        this.log('✅ Occupancy reporting configured');
      } catch (err) {
        this.log(`⚠️ Occupancy reporting failed: ${err.message}`);
      }
    }

    // Battery reporting (less frequent)
    if (ep.clusters?.powerConfiguration?.configureReporting) {
      try {
        await ep.clusters.powerConfiguration.configureReporting({
          batteryPercentageRemaining: {
            minInterval: 3600,    // Min 1 hour
            maxInterval: 43200,   // Max 12 hours
            minChange: 2,         // 1% change (ZCL uses 0-200)
          },
        });
        reportingConfigs.push('battery');
        this.log('✅ Battery reporting configured');
      } catch (err) {
        this.log(`⚠️ Battery reporting failed: ${err.message}`);
      }
    }

    this.log(`📊 Reporting configured for: ${reportingConfigs.join(', ') || 'none'}`);
    return reportingConfigs;
  }

  /**
   * Bind all clusters to coordinator
   * Required for attribute reporting to work
   */
  async bindAllClusters(options = {}) {
    const { endpoint = 1 } = options;

    this.log('🔗 Binding clusters to coordinator...');

    const zclNode = this.device.zclNode;
    if (!zclNode?.endpoints?.[endpoint]) return;

    const ep = zclNode.endpoints[endpoint];
    const boundClusters = [];

    const clustersToBind = [
      'temperatureMeasurement',
      'relativeHumidityMeasurement',
      'illuminanceMeasurement',
      'occupancySensing',
      'powerConfiguration',
      'iasZone',
    ];

    for (const clusterName of clustersToBind) {
      const cluster = ep.clusters?.[clusterName];
      if (!cluster?.bind) continue;

      try {
        await cluster.bind();
        boundClusters.push(clusterName);
        this.log(`✅ Bound ${clusterName}`);
      } catch (err) {
        this.log(`⚠️ Bind ${clusterName} failed: ${err.message}`);
      }
    }

    return boundClusters;
  }

  /**
   * Comprehensive data query - tries EVERYTHING
   */
  async queryComprehensive() {
    this.log('🚀 Starting comprehensive ZCL data query...');

    // Step 1: Bind clusters (if not already done)
    await this.bindAllClusters().catch(() => { });

    // Step 2: Configure reporting
    await this.configureAllReporting().catch(() => { });

    // Step 3: Read current values
    const results = await this.queryAllAttributes().catch(() => ({}));

    // Step 4: Special handling for IAS Zone
    await this._queryIASZone().catch(() => { });

    return results;
  }

  /**
   * Special IAS Zone handling
   */
  async _queryIASZone() {
    const ep = this.device.zclNode?.endpoints?.[1];
    const iasCluster = ep?.clusters?.iasZone;
    if (!iasCluster) return;

    this.log('🛡️ Querying IAS Zone...');

    try {
      // Read zone status
      const data = await iasCluster.readAttributes(['zoneStatus', 'zoneType', 'zoneState']);

      if (data) {
        this.log(`IAS Zone: status=${data.zoneStatus}, type=${data.zoneType}, state=${data.zoneState}`);

        // Determine capability based on zone type
        let capability = 'alarm_motion'; // Default
        if (data.zoneType === 0x000d) capability = 'alarm_motion';      // Motion sensor
        if (data.zoneType === 0x0015) capability = 'alarm_contact';     // Contact sensor
        if (data.zoneType === 0x002a) capability = 'alarm_water';       // Water leak
        if (data.zoneType === 0x0028) capability = 'alarm_smoke';       // Smoke
        if (data.zoneType === 0x0029) capability = 'alarm_fire';        // Fire

        if (data.zoneStatus != null && this.device.hasCapability(capability)) {
          const alarm = (data.zoneStatus & 1) !== 0;
          await this.device.setCapabilityValue(capability, alarm).catch(() => { });
          this.log(`✅ ${capability} = ${alarm}`);
        }
      }
    } catch (err) {
      this.log(`⚠️ IAS Zone query failed: ${err.message}`);
    }
  }

  /**
   * Log device cluster info for debugging
   */
  async logClusterInfo() {
    const ep = this.device.zclNode?.endpoints?.[1];
    if (!ep?.clusters) {
      this.log('⚠️ No clusters available');
      return;
    }

    this.log('═══════════════════════════════════════════');
    this.log('📋 DEVICE CLUSTER ANALYSIS');
    this.log('═══════════════════════════════════════════');

    for (const [name, cluster] of Object.entries(ep.clusters)) {
      const hasRead = typeof cluster.readAttributes === 'function';
      const hasBind = typeof cluster.bind === 'function';
      const hasReport = typeof cluster.configureReporting === 'function';

      this.log(`  ${name}:`);
      this.log(`    - readAttributes: ${hasRead ? '✅' : '❌'}`);
      this.log(`    - bind: ${hasBind ? '✅' : '❌'}`);
      this.log(`    - configureReporting: ${hasReport ? '✅' : '❌'}`);
    }

    this.log('═══════════════════════════════════════════');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HYBRID DATA QUERY - Combines Tuya + Zigbee
// ═══════════════════════════════════════════════════════════════════════════

class HybridDataQuery {
  constructor(device) {
    this.device = device;
    this.zigbeeQuery = new ZigbeeDataQuery(device);
    this._lastQueryTime = null;
  }

  log(msg) {
    this.device.log?.(`[HYBRID-QUERY] ${msg}`);
  }

  /**
   * Mark device as awake - call when receiving ANY data
   */
  markAwake() {
    this.zigbeeQuery.markAwake();

    // Also trigger comprehensive query since device is awake
    this._queryWhileAwake();
  }

  /**
   * Query while device is awake
   */
  async _queryWhileAwake() {
    // Debounce - don't query more than once per 5 seconds
    if (this._lastQueryTime && (Date.now() - this._lastQueryTime) < 5000) {
      return;
    }
    this._lastQueryTime = Date.now();

    this.log('⚡ Device awake - querying BOTH protocols...');

    // Query Tuya DPs if available
    if (this.device.tuyaDataQuery) {
      const dpMappings = this.device.dpMappings || {};
      const dpIds = Object.keys(dpMappings).map(Number).filter(n => !isNaN(n));
      if (dpIds.length > 0) {
        await this.device.tuyaDataQuery(dpIds, {
          logPrefix: '[HYBRID-TUYA]',
          delayBetweenQueries: 50,
        }).catch(() => { });
      }
    }

    // Query ZCL attributes
    await this.zigbeeQuery.queryAllAttributes().catch(() => { });
  }

  /**
   * Full initialization - bind + configure + query
   */
  async initialize() {
    this.log('🚀 Initializing hybrid data query...');

    // Bind ZCL clusters
    await this.zigbeeQuery.bindAllClusters();

    // Configure reporting
    await this.zigbeeQuery.configureAllReporting();

    // Initial query
    await this.zigbeeQuery.queryAllAttributes();

    // Log cluster info for debugging
    await this.zigbeeQuery.logClusterInfo();

    this.log('✅ Hybrid data query initialized');
  }

  /**
   * Force comprehensive query of both protocols
   */
  async forceQuery() {
    this.log('🔄 Force querying both protocols...');

    // Tuya DPs
    if (this.device.tuyaDataQuery) {
      const dpMappings = this.device.dpMappings || {};
      const dpIds = Object.keys(dpMappings).map(Number).filter(n => !isNaN(n));
      if (dpIds.length > 0) {
        this.log(`📡 Tuya: Querying ${dpIds.length} DPs`);
        await this.device.tuyaDataQuery(dpIds).catch(() => { });
      }
    }

    // ZCL attributes
    this.log('📖 ZCL: Querying attributes');
    await this.zigbeeQuery.queryComprehensive().catch(() => { });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  ZigbeeDataQuery,
  HybridDataQuery,
  ZCL_CLUSTERS,
  CLUSTER_CAPABILITY_MAP,
};
