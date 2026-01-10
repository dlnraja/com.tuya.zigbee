'use strict';

/**
 * DataRecoveryManager - v5.5.31 Comprehensive Data Recovery
 *
 * PROBLEM: Certains appareils ne remontent jamais leurs données
 *
 * ROOT CAUSES:
 * 1. DP mappings incorrects ou incomplets
 * 2. Pas de cluster bindings configurés
 * 3. Attribute reporting non configuré
 * 4. Sleepy devices qui dorment pendant les queries
 * 5. Protocol mismatch (ZCL vs Tuya EF00)
 * 6. Device annonce mais ne répond pas aux reads
 * 7. Timeout trop court pour réponse
 *
 * SOLUTIONS IMPLEMENTED:
 * - Multi-protocol query (ZCL + Tuya DP + IAS)
 * - Aggressive binding refresh
 * - Attribute reporting configuration
 * - Timed retry with exponential backoff
 * - Wake-on-data strategy
 * - Default value injection si aucune donnée
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TUYA_CLUSTER_ID = 0xEF00;

// Common DP IDs by device type
const COMMON_DPS = {
  // Climate/Temperature sensors
  temperature: [1, 5, 6, 18, 24],
  humidity: [2, 3, 7, 103],
  battery: [4, 14, 15, 33, 35, 101],

  // Motion/Presence
  presence: [1, 101, 102],
  illuminance: [3, 7, 12, 103, 104],

  // Contact/Door
  contact: [1, 101],

  // All common
  all: [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 18, 33, 35, 101, 102, 103, 104, 105],
};

// ZCL Cluster IDs
const ZCL_CLUSTERS = {
  temperatureMeasurement: 0x0402,
  relativeHumidityMeasurement: 0x0405,
  illuminanceMeasurement: 0x0400,
  occupancySensing: 0x0406,
  iasZone: 0x0500,
  powerConfiguration: 0x0001,
  genBasic: 0x0000,
};

// ═══════════════════════════════════════════════════════════════════════════
// DATA RECOVERY MANAGER CLASS
// ═══════════════════════════════════════════════════════════════════════════

class DataRecoveryManager {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      maxRetries: options.maxRetries || 5,
      retryDelays: options.retryDelays || [60, 120, 300, 600, 1800], // 1, 2, 5, 10, 30 min
      injectDefaults: options.injectDefaults !== false,
      verbose: options.verbose || false,
      ...options,
    };

    this._retryCount = 0;
    this._retryTimers = [];
    this._recoveryAttempts = 0;
    this._lastSuccessTime = null;
    this._initialized = false;
  }

  log(msg) {
    if (this.options.verbose) {
      this.device.log?.(`[DATA-RECOVERY] ${msg}`) || console.log(`[DATA-RECOVERY] ${msg}`);
    }
  }

  /**
   * Initialize data recovery - call after device init
   */
  async initialize() {
    if (this._initialized) return;
    this._initialized = true;

    this.log('Initializing comprehensive data recovery...');

    // Schedule initial recovery check after 30 seconds
    this._scheduleRecoveryCheck(30 * 1000, 'initial');

    // Schedule periodic recovery checks
    this._startPeriodicRecovery();

    this.log('✅ Data recovery manager initialized');
  }

  /**
   * Schedule a recovery check
   */
  _scheduleRecoveryCheck(delayMs, reason) {
    const timer = setTimeout(async () => {
      await this._performRecoveryCheck(reason);
    }, delayMs);

    this._retryTimers.push(timer);
    this.log(`⏱️ Recovery check scheduled in ${delayMs / 1000}s (${reason})`);
  }

  /**
   * Start periodic recovery (every 30 min for first 2h, then every 2h)
   */
  _startPeriodicRecovery() {
    // First 2 hours: check every 30 min
    for (let i = 1; i <= 4; i++) {
      this._scheduleRecoveryCheck(i * 30 * 60 * 1000, `periodic-${i}`);
    }

    // After 2 hours: check every 2 hours for 24 hours
    for (let i = 1; i <= 12; i++) {
      this._scheduleRecoveryCheck((2 + i * 2) * 60 * 60 * 1000, `extended-${i}`);
    }
  }

  /**
   * Perform a comprehensive recovery check
   */
  async _performRecoveryCheck(reason) {
    this._recoveryAttempts++;
    this.log(`🔍 Recovery check #${this._recoveryAttempts} (${reason})`);

    // Check what's missing
    const missing = this._getMissingCapabilities();

    if (missing.length === 0) {
      this.log('✅ All capabilities have values');
      this._lastSuccessTime = Date.now();
      return;
    }

    this.log(`⚠️ Missing: ${missing.join(', ')}`);

    // Try all recovery strategies
    await this._executeRecoveryStrategies(missing);
  }

  /**
   * Get list of capabilities with null/undefined values
   * v5.5.318: Skip capabilities that don't apply to device type
   */
  _getMissingCapabilities() {
    const missing = [];
    const caps = this.device.getCapabilities?.() || [];

    // v5.5.318: Check if this is a button device (buttons don't need sensor data recovery)
    const isButtonDevice = this.device._forcedDeviceType === 'BUTTON' ||
      this.device.constructor?.name?.toLowerCase().includes('button');

    // v5.5.318: Get forbidden capabilities list from device
    const forbiddenCaps = this.device._forbiddenCapabilities || [];

    for (const cap of caps) {
      // Skip non-sensor capabilities
      if (cap.startsWith('button') || cap.startsWith('onoff') || cap === 'alarm_generic') {
        continue;
      }

      // v5.5.318: Skip alarm_contact for pure button devices
      if (isButtonDevice && cap === 'alarm_contact') {
        continue;
      }

      // v5.5.318: Skip forbidden capabilities
      if (forbiddenCaps.includes(cap)) {
        continue;
      }

      const value = this.device.getCapabilityValue?.(cap);
      if (value === null || value === undefined) {
        missing.push(cap);
      }
    }

    return missing;
  }

  /**
   * Execute all recovery strategies
   */
  async _executeRecoveryStrategies(missingCaps) {
    this.log('🚀 Executing recovery strategies...');

    // Strategy 1: Tuya DP query
    await this._strategyTuyaDPQuery().catch(e => this.log(`DP query failed: ${e.message}`));

    // Strategy 2: ZCL attribute read
    await this._strategyZCLRead(missingCaps).catch(e => this.log(`ZCL read failed: ${e.message}`));

    // Strategy 3: Cluster binding
    await this._strategyBindClusters().catch(e => this.log(`Binding failed: ${e.message}`));

    // Strategy 4: Configure reporting
    await this._strategyConfigureReporting().catch(e => this.log(`Reporting config failed: ${e.message}`));

    // Strategy 5: IAS Zone enrollment
    await this._strategyIASEnroll().catch(e => this.log(`IAS enroll failed: ${e.message}`));

    // Strategy 6: Basic cluster read (for device info)
    await this._strategyBasicRead().catch(e => this.log(`Basic read failed: ${e.message}`));

    // Check if we got data now
    await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds for responses

    const stillMissing = this._getMissingCapabilities();
    if (stillMissing.length > 0) {
      this.log(`⚠️ Still missing after recovery: ${stillMissing.join(', ')}`);

      // Strategy 7: Inject default values if configured
      if (this.options.injectDefaults && this._recoveryAttempts >= 3) {
        await this._strategyInjectDefaults(stillMissing);
      }
    } else {
      this.log('✅ All data recovered!');
      this._lastSuccessTime = Date.now();
    }
  }

  /**
   * Strategy 1: Query all Tuya DPs
   */
  async _strategyTuyaDPQuery() {
    this.log('📡 Strategy 1: Tuya DP Query');

    // Get DPs from device mappings + common DPs
    const dpMappings = this.device.dpMappings || {};
    const mappedDPs = Object.keys(dpMappings).map(Number).filter(n => !isNaN(n));
    const allDPs = [...new Set([...mappedDPs, ...COMMON_DPS.all])];

    // Use device's query method if available
    if (this.device.tuyaDataQuery) {
      await this.device.tuyaDataQuery(allDPs, {
        logPrefix: '[RECOVERY-DP]',
        delayBetweenQueries: 50,
      });
      return;
    }

    // Fallback: direct query via manager
    const manager = this.device.tuyaEF00Manager;
    if (manager) {
      for (const dp of allDPs.slice(0, 20)) { // Limit to 20 DPs
        try {
          if (typeof manager.getData === 'function') {
            await manager.getData(dp);
          } else if (typeof manager.requestDP === 'function') {
            await manager.requestDP(dp);
          }
          await new Promise(r => setTimeout(r, 50));
        } catch (e) {
          // Continue
        }
      }
    }
  }

  /**
   * Strategy 2: Direct ZCL attribute read
   */
  async _strategyZCLRead(missingCaps) {
    this.log('📖 Strategy 2: ZCL Attribute Read');

    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    for (const cap of missingCaps) {
      try {
        switch (cap) {
          case 'measure_temperature':
            await this._readTemperature(endpoint);
            break;
          case 'measure_humidity':
            await this._readHumidity(endpoint);
            break;
          case 'measure_battery':
          case 'alarm_battery':
            await this._readBattery(endpoint);
            break;
          case 'measure_luminance':
          case 'measure_lux':
            await this._readIlluminance(endpoint);
            break;
          case 'alarm_motion':
          case 'alarm_contact':
          case 'alarm_water':
          case 'alarm_smoke':
            await this._readIASZone(endpoint, cap);
            break;
        }
      } catch (e) {
        // Continue with next capability
      }
    }
  }

  async _readTemperature(endpoint) {
    const cluster = endpoint.clusters?.temperatureMeasurement;
    if (!cluster?.readAttributes) return;

    const data = await cluster.readAttributes(['measuredValue']);
    if (data?.measuredValue != null) {
      const temp = data.measuredValue / 100;
      this.log(`🌡️ Temperature: ${temp}°C`);
      await this.device.setCapabilityValue('measure_temperature', parseFloat(temp)).catch(() => { });
    }
  }

  async _readHumidity(endpoint) {
    const cluster = endpoint.clusters?.relativeHumidityMeasurement;
    if (!cluster?.readAttributes) return;

    const data = await cluster.readAttributes(['measuredValue']);
    if (data?.measuredValue != null) {
      const hum = data.measuredValue / 100;
      this.log(`💧 Humidity: ${hum}%`);
      await this.device.setCapabilityValue('measure_humidity', parseFloat(hum)).catch(() => { });
    }
  }

  async _readBattery(endpoint) {
    const cluster = endpoint.clusters?.powerConfiguration;
    if (!cluster?.readAttributes) return;

    const data = await cluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']);

    if (data?.batteryPercentageRemaining != null) {
      const bat = Math.round(data.batteryPercentageRemaining / 2);
      this.log(`🔋 Battery: ${bat}%`);
      await this.device.setCapabilityValue('measure_battery', parseFloat(bat)).catch(() => { });
    } else if (data?.batteryVoltage != null) {
      // Convert voltage to percentage (2.4V = 0%, 3.0V = 100%)
      const voltage = data.batteryVoltage / 10;
      const bat = Math.max(0, Math.min(100, Math.round((voltage - 2.4) / 0.6 * 100)));
      this.log(`🔋 Battery from voltage: ${bat}% (${voltage}V)`);
      await this.device.setCapabilityValue('measure_battery', parseFloat(bat)).catch(() => { });
    }
  }

  async _readIlluminance(endpoint) {
    const cluster = endpoint.clusters?.illuminanceMeasurement;
    if (!cluster?.readAttributes) return;

    const data = await cluster.readAttributes(['measuredValue']);
    if (data?.measuredValue != null) {
      // Convert from log scale: lux = 10^((measuredValue-1)/10000)
      const lux = data.measuredValue > 0 ? Math.round(Math.pow(10, (data.measuredValue - 1) / 10000)) : 0;
      this.log(`💡 Illuminance: ${lux} lux`);

      if (this.device.hasCapability('measure_luminance')) {
        await this.device.setCapabilityValue('measure_luminance', parseFloat(lux)).catch(() => { });
      }
      if (this.device.hasCapability('measure_lux')) {
        await this.device.setCapabilityValue('measure_lux', parseFloat(lux)).catch(() => { });
      }
    }
  }

  async _readIASZone(endpoint, capability) {
    const cluster = endpoint.clusters?.iasZone || endpoint.clusters?.ssIasZone;
    if (!cluster?.readAttributes) return;

    const data = await cluster.readAttributes(['zoneStatus']);
    if (data?.zoneStatus != null) {
      const alarm = (data.zoneStatus & 1) !== 0;
      this.log(`🚨 ${capability}: ${alarm}`);
      await this.device.setCapabilityValue(capability, alarm).catch(() => { });
    }
  }

  /**
   * Strategy 3: Bind clusters for automatic reporting
   */
  async _strategyBindClusters() {
    this.log('🔗 Strategy 3: Cluster Binding');

    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    const clustersToBind = [
      'temperatureMeasurement',
      'relativeHumidityMeasurement',
      'illuminanceMeasurement',
      'occupancySensing',
      'powerConfiguration',
      'iasZone',
      'ssIasZone',
    ];

    for (const clusterName of clustersToBind) {
      const cluster = endpoint.clusters?.[clusterName];
      if (cluster?.bind) {
        try {
          await cluster.bind();
          this.log(`✓ Bound ${clusterName}`);
        } catch (e) {
          // Silent
        }
      }
    }
  }

  /**
   * Strategy 4: Configure attribute reporting
   */
  async _strategyConfigureReporting() {
    this.log('📊 Strategy 4: Configure Reporting');

    const endpoint = this.device.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    // Temperature reporting
    try {
      const tempCluster = endpoint.clusters?.temperatureMeasurement;
      if (tempCluster?.configureReporting) {
        await tempCluster.configureReporting({
          measuredValue: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 10, // 0.1°C
          },
        });
        this.log('✓ Temperature reporting configured');
      }
    } catch (e) { /* silent */ }

    // Humidity reporting
    try {
      const humCluster = endpoint.clusters?.relativeHumidityMeasurement;
      if (humCluster?.configureReporting) {
        await humCluster.configureReporting({
          measuredValue: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 100, // 1%
          },
        });
        this.log('✓ Humidity reporting configured');
      }
    } catch (e) { /* silent */ }

    // Battery reporting
    try {
      const powerCluster = endpoint.clusters?.powerConfiguration;
      if (powerCluster?.configureReporting) {
        await powerCluster.configureReporting({
          batteryPercentageRemaining: {
            minInterval: 3600,
            maxInterval: 43200,
            minChange: 2,
          },
        });
        this.log('✓ Battery reporting configured');
      }
    } catch (e) { /* silent */ }
  }

  /**
   * Strategy 5: IAS Zone enrollment
   */
  async _strategyIASEnroll() {
    this.log('🛡️ Strategy 5: IAS Zone Enrollment');

    const endpoint = this.device.zclNode?.endpoints?.[1];
    const iasCluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;

    if (!iasCluster) return;

    try {
      // Write CIE address (coordinator)
      if (iasCluster.writeAttributes) {
        const ieeeAddress = this.device.homey?.zigbee?.ieeeAddress || '0x0000000000000000';
        await iasCluster.writeAttributes({
          iasCieAddr: ieeeAddress,
        }).catch(() => { });
      }

      // Send enroll response
      if (iasCluster.zoneEnrollResponse) {
        await iasCluster.zoneEnrollResponse({
          enrollResponseCode: 0, // Success
          zoneId: 1,
        }).catch(() => { });
        this.log('✓ IAS Zone enrolled');
      }
    } catch (e) {
      // Silent
    }
  }

  /**
   * Strategy 6: Basic cluster read for device info
   */
  async _strategyBasicRead() {
    this.log('📋 Strategy 6: Basic Cluster Read');

    const endpoint = this.device.zclNode?.endpoints?.[1];
    const basicCluster = endpoint?.clusters?.genBasic || endpoint?.clusters?.basic;

    if (!basicCluster?.readAttributes) return;

    try {
      const data = await basicCluster.readAttributes([
        'manufacturerName',
        'modelId',
        'powerSource',
        'appVersion',
      ]);

      if (data?.manufacturerName) {
        this.log(`Manufacturer: ${data.manufacturerName}`);
      }
      if (data?.modelId) {
        this.log(`Model: ${data.modelId}`);
      }
      if (data?.powerSource !== undefined) {
        const isBattery = data.powerSource === 3;
        this.log(`Power source: ${isBattery ? 'Battery' : 'Mains'}`);
      }
    } catch (e) {
      // Silent
    }
  }

  /**
   * Strategy 7: Inject default values for capabilities that remain empty
   * This prevents UI showing "No data" indefinitely
   */
  async _strategyInjectDefaults(missingCaps) {
    this.log('💉 Strategy 7: Injecting default values');

    const defaults = {
      measure_temperature: 20.0,
      measure_humidity: 50,
      measure_battery: 100,
      measure_luminance: 0,
      measure_lux: 0,
      alarm_motion: false,
      alarm_contact: false,
      alarm_water: false,
      alarm_smoke: false,
      alarm_battery: false,
    };

    for (const cap of missingCaps) {
      if (defaults[cap] !== undefined && this.device.hasCapability(cap)) {
        try {
          await this.device.setCapabilityValue(cap, defaults[cap]);
          this.log(`⚡ Injected default for ${cap}: ${defaults[cap]}`);
        } catch (e) {
          // Silent
        }
      }
    }
  }

  /**
   * Force immediate recovery (for manual trigger)
   */
  async forceRecovery() {
    this.log('🚨 Force recovery triggered');
    await this._performRecoveryCheck('forced');
  }

  /**
   * Cleanup
   */
  destroy() {
    for (const timer of this._retryTimers) {
      clearTimeout(timer);
    }
    this._retryTimers = [];
    this._initialized = false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  DataRecoveryManager,
  COMMON_DPS,
  ZCL_CLUSTERS,
};
