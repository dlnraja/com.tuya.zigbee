'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const TuyaDPDatabase = require('../../lib/tuya/TuyaDPDatabase');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');
const TuyaDPDeviceHelper = require('../../lib/TuyaDPDeviceHelper');
const { initTuyaDpEngineSafe, hasValidEF00Manager, logEF00Status } = require('../../lib/tuya/TuyaEF00Base');

/**
 * PresenceSensorRadarDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class PresenceSensorRadarDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    try {
      // Sanity checks
      if (!zclNode) {
        this.log('[ERROR] onNodeInit: missing zclNode');
        return;
      }

      this.log('[RADAR] 📡 Presence Radar initializing...');

      // Store zclNode
      this.zclNode = zclNode;

      // CRITICAL: FORCE Tuya DP mode for ALL TS0601
      const productId = this.getData()?.productId || this.getSetting('zb_product_id');
      const isTS0601 = productId === 'TS0601';

      this.log('[RADAR] 🔍 Product ID:', productId);

      if (isTS0601) {
        this.log('[RADAR] 🚨 TS0601 detected - FORCING Tuya DP mode');
        this.usesTuyaDP = true;
        this.usesTuyaDPBattery = true; // Battery via DP (if present)
        this.hasTuyaCluster = true;
        this.isTuyaDevice = true;
      }

      // Initialize base FIRST (creates tuyaEF00Manager if TS0601)
      await super.onNodeInit({ zclNode }).catch(err => this.error(err));

      // THEN setup V4 systems AFTER base initialization
      if (isTS0601) {
        // 🆕 v5.0.3: PHASE 1 - Safe EF00 Manager initialization
        await this._initTuyaDpEngine(zclNode);

        // 🆕 v5.0.3: Battery Manager V4 (PHASE 5 - battery pipeline)
        this.log('[RADAR-V4] 🔋 Starting Battery Manager V4...');
        this.batteryManagerV4 = new BatteryManagerV4(this, 'CR2032');
        await this.batteryManagerV4.startMonitoring().catch(err => {
          this.log('[RADAR-V4] ⚠️  Battery V4 init failed:', err.message);
        });
      }

      // Only setup standard Zigbee if NOT Tuya DP
      if (!this.isTuyaDevice) {
        TuyaDPDeviceHelper.logClusterAction(this, 'configure');
        // THEN setup (zclNode now exists)
        await this.setupAttributeReporting();

        // Setup IAS Zone (SDK3 - based on Peter's success patterns)
        await this.setupIASZone();

        // Setup sensor capabilities (SDK3)
        await this.registerLuminanceCapability();
      } else {
        // CURSOR PHASE 6: Skip standard ZCL config for Tuya DP devices
        TuyaDPDeviceHelper.logClusterAction(this, 'skip');
        this.log('[TUYA-DP] Device type:', TuyaDPDeviceHelper.getDeviceType(this));
        this.log('[TUYA-DP] Behavior:', TuyaDPDeviceHelper.getExpectedBehavior(this));
      }

      // Safe set available
      if (typeof this._safeResolveAvailable === 'function') {
        this._safeResolveAvailable(true);
      } else if (typeof this.setAvailable === 'function') {
        this.setAvailable();
      }

      this.log('[RADAR] ✅ Presence Radar initialized!');
      this.log('[RADAR] Power:', this.powerSource || 'unknown');
      this.log('[RADAR] Type:', this.isTuyaDevice ? 'Tuya TS0601' : 'Standard Zigbee');
    } catch (err) {
      this.log('[ERROR] onNodeInit outer catch:', err);
      if (typeof this._safeRejectAvailable === 'function') {
        this._safeRejectAvailable(err);
      }
    }
  }


  /**
   * Initialize Tuya DP engine with safe EF00 manager access
   * v5.0.6 - CRITICAL FIX: Use initTuyaDpEngineSafe() like climate_sensor_soil
   */
  async _initTuyaDpEngine(zclNode) {
    try {
      this.log('[RADAR] 🔧 Initializing Tuya DP engine...');

      // v5.0.6: PHASE 1 - Safe EF00 Manager initialization
      const manager = await initTuyaDpEngineSafe(this, zclNode);

      if (!manager) {
        this.log('[RADAR] ⚠️  EF00 manager not available, skipping DP setup');
        this.log('[RADAR] ℹ️  Device will work with standard Zigbee if available');
        // Mark that Tuya cluster is NOT available for BatteryManagerV4
        this._tuyaClusterAvailable = false;
        return;
      }

      // Mark that Tuya cluster IS available
      this._tuyaClusterAvailable = true;

      // Log manager status for diagnostics
      logEF00Status(this);

      // Get DP configuration from settings or database
      const dpConfigRaw = this.getSetting('tuya_dp_configuration');
      const dpDebugMode = this.getSetting('dp_debug_mode');
      let dpMap = {};

      try {
        if (dpConfigRaw) {
          dpMap = JSON.parse(dpConfigRaw);
        }
      } catch (err) {
        this.error('[RADAR] Invalid tuya_dp_configuration JSON:', err.message);
      }

      // Fallback to database if no settings
      if (!dpMap || !Object.keys(dpMap).length) {
        dpMap = TuyaDPDatabase.getProfileForDevice
          ? TuyaDPDatabase.getProfileForDevice(this)
          : null;

        if (dpMap) {
          this.log('[RADAR] ✅ DP config loaded from database');
        }
      }

      // Use safe defaults for presence sensor if nothing found
      if (!dpMap || !Object.keys(dpMap).length) {
        this.log('[RADAR] ℹ️  No DP config found, using safe defaults for radar');
        dpMap = {
          '1': 'presence',
          '4': 'battery_percentage',
          '9': 'sensitivity',
          '10': 'detection_delay',
          '12': 'distance'
        };
      }

      this.dpMap = dpMap;
      this.dpDebugMode = dpDebugMode;
      this.log('[RADAR] 📊 DP Map:', JSON.stringify(this.dpMap));
      this.log('[RADAR] Debug mode:', dpDebugMode);

      // Register with TuyaEF00Manager
      this.log('[RADAR] 🔌 Registering DP listeners...');

      // If debug mode, listen to ALL DPs
      if (dpDebugMode) {
        this.log('[RADAR] 🐛 DEBUG MODE: Listening to ALL DP events');
        manager.on('dataReport', (data) => {
          this.log('[RADAR-DEBUG] Raw dataReport:', JSON.stringify(data));
        });
      }

      // Register listeners for known DPs
      Object.keys(this.dpMap).forEach(dpId => {
        const eventName = `dp-${dpId}`;
        manager.on(eventName, (value) => {
          this._onDataPoint(parseInt(dpId), value);
        });
        this.log(`[RADAR] ✅ Listening: ${eventName} → ${this.dpMap[dpId]}`);
      });

      // Auto-setup with TuyaDPMapper
      await TuyaDPMapper.autoSetup(this, zclNode).catch(err => {
        this.log('[RADAR] ⚠️  Auto-mapping failed:', err.message);
      });

      this.log('[RADAR] ✅ Tuya DP engine initialized successfully');

    } catch (err) {
      this.error('[RADAR] ❌ Failed to init Tuya DP engine:', err);
      this._tuyaClusterAvailable = false;
    }
  }

  /**
   * Handle individual DataPoint value
   * Maps DP to capability using tuya_dp_configuration
   * Note: DPs for radar may vary, use dp_debug_mode to identify
   */
  _onDataPoint(dpId, value) {
    const role = this.dpMap[String(dpId)];

    if (this.dpDebugMode) {
      this.log('[TS0601-RADAR][DP-DEBUG] DP', dpId, 'role', role, 'value', value, 'type', typeof value);
    } else {
      this.log('[TS0601-RADAR] DP', dpId, 'role', role, 'value', value);
    }

    switch (role) {
      case 'presence':
      case 'motion': {
        this.setCapabilityValue('alarm_motion', !!value).catch(this.error);
        break;
      }

      case 'illuminance':
      case 'luminance': {
        // selon l'unité (Lux ou %), adapter
        this.setCapabilityValue('measure_luminance', value).catch(this.error);
        break;
      }

      case 'battery_percentage': {
        this.setCapabilityValue('measure_battery', value).catch(this.error);
        break;
      }

      case 'distance':
      case 'sensitivity':
      case 'detection_delay':
      case 'fading_time': {
        // Configuration DPs - log only
        this.log(`[TS0601-RADAR] Config DP ${dpId} (${role}):`, value);
        break;
      }

      default:
        if (this.dpDebugMode) {
          this.log('[TS0601-RADAR][DP-DEBUG] ⚠️  Unhandled DP', dpId, 'role', role, 'value', value);
          this.log('[TS0601-RADAR][DP-DEBUG] 💡 Add to tuya_dp_configuration to map this DP');
        } else {
          this.log('[TS0601-RADAR] Unhandled DP', dpId, 'role', role, 'value', value);
        }
    }
  }

  /**
   * Setup IAS Zone for Motion detection (SDK3 Compliant)
   *
   * Based on Peter's successful diagnostic patterns:
   * - Temperature/Humidity/Lux work via standard clusters [OK]
   * - IAS Zone requires special SDK3 enrollment method
   *
   * Cluster 1280 (IASZone) - Motion/Alarm detection
   */
  /**
   * Setup IAS Zone (SDK3 - Based on IASZoneEnroller_SIMPLE_v4.0.6.js)
   * Version la plus récente du projet (2025-10-21)
   */
  async setupIASZone() {
    this.log('🔐 Setting up IAS Zone (SDK3 latest method)...');

    const endpoint = this.zclNode.endpoints[1];

    if (!endpoint?.clusters?.iasZone) {
      this.log('[INFO]  IAS Zone cluster not available');
      return;
    }

    try {
      // Step 1: Setup Zone Enroll Request listener (SYNCHRONOUS - property assignment)
      // SDK3: Use property assignment, NOT .on() event listener
      endpoint.clusters.iasZone.onZoneEnrollRequest = async () => {
        this.log('[MSG] Zone Enroll Request received');

        try {
          // Send response IMMEDIATELY
          await endpoint.clusters.iasZone.zoneEnrollResponse({
            enrollResponseCode: 0, // 0 = Success
            zoneId: 10
          });

          this.log('[OK] Zone Enroll Response sent (zoneId: 10)');
        } catch (err) {
          this.error('Failed to send Zone Enroll Response:', err.message);
        }
      };

      this.log('[OK] Zone Enroll Request listener configured');

      // Step 2: Send proactive Zone Enroll Response (SDK3 official method)
      // Per Homey docs: "driver could send Zone Enroll Response when initializing
      // regardless of having received Zone Enroll Request"
      this.log('[SEND] Sending proactive Zone Enroll Response...');

      try {
        await endpoint.clusters.iasZone.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 10
        });

        this.log('[OK] Proactive Zone Enroll Response sent');
      } catch (err) {
        this.log('[WARN]  Proactive response failed (normal if device not ready):', err.message);
      }

      // Step 3: Setup Zone Status Change listener (property assignment)
      // SDK3: Use .onZoneStatusChangeNotification property, NOT .on() event
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
        this.log('[MSG] Zone notification received:', payload);

        if (payload && payload.zoneStatus !== undefined) {
          // Convert Bitmap to value if needed
          let status = payload.zoneStatus;
          if (status && typeof status.valueOf === 'function') {
            status = status.valueOf();
          }

          // Check alarm1 bit (motion/alarm detected)
          const alarm = (status & 0x01) !== 0;

          this.setCapabilityValue('alarm_motion', alarm).catch(this.error);
          this.log(`${alarm ? '[ALARM]' : '[OK]'} Alarm: ${alarm ? 'TRIGGERED' : 'cleared'}`);
        }
      };

      this.log('[OK] Zone Status listener configured');

      // Step 4: Setup Zone Status attribute listener (property assignment)
      // Alternative listener for attribute reports
      endpoint.clusters.iasZone.onZoneStatus = async (zoneStatus) => {
        this.log('[DATA] Zone attribute report:', zoneStatus);

        let status = zoneStatus;
        if (status && typeof status.valueOf === 'function') {
          status = status.valueOf();
        }

        const alarm = (status & 0x01) !== 0;
        await (async () => {
          this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_motion'} = ${alarm}`);
          try {
            await this.setCapabilityValue('alarm_motion', alarm);
            this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_motion'}`);
          } catch (err) {
            this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_motion'}`, err.message);
            throw err;
          }
        })().catch(this.error);
      };

      this.log('[OK] IAS Zone configured successfully (SDK3 latest method)');

    } catch (err) {
      this.error('IAS Zone setup failed:', err);
    }
  }

  async onDeleted() {
    this.log('PresenceSensorRadarDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
  /**
   * Setup Attribute Reporting for Presence Sensor
   * Temperature, Humidity, Battery, Illuminance, Motion
   */
  async setupAttributeReporting() {
    try {
      this.log('[DATA] Setting up attribute reporting...');

      const endpoint = this.zclNode.endpoints[1];

      // Setup cluster listeners FIRST (before configureAttributeReporting)

      // Temperature listener (cluster 1026)
      if (endpoint?.clusters?.msTemperatureMeasurement) {
        endpoint.clusters.msTemperatureMeasurement.on('attr.measuredValue', async (value) => {
          const temperature = value / 100;
          this.log('[TEMP] Temperature:', temperature);
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'measure_temperature'} = ${temperature}`);
            try {
              await this.setCapabilityValue('measure_temperature', temperature);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_temperature'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_temperature'}`, err.message);
              throw err;
            }
          })().catch(this.error);
        });
      }

      // Humidity listener (cluster 1029)
      if (endpoint?.clusters?.msRelativeHumidity) {
        endpoint.clusters.msRelativeHumidity.on('attr.measuredValue', async (value) => {
          const humidity = value / 100;
          this.log('[HUMID] Humidity:', humidity);
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'measure_humidity'} = ${humidity}`);
            try {
              await this.setCapabilityValue('measure_humidity', humidity);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_humidity'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_humidity'}`, err.message);
              throw err;
            }
          })().catch(this.error);
        });
      }

      // Battery listener (cluster 1)
      if (endpoint?.clusters?.genPowerCfg) {
        endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', async (value) => {
          const battery = value / 2;
          this.log('[BATTERY] Battery:', battery, '%');
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'measure_battery'} = ${battery}`);
            try {
              await this.setCapabilityValue('measure_battery', battery);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_battery'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_battery'}`, err.message);
              throw err;
            }
          })().catch(this.error);
        });
      }

      // Illuminance listener (cluster 1024)
      if (endpoint?.clusters?.msIlluminanceMeasurement) {
        endpoint.clusters.msIlluminanceMeasurement.on('attr.measuredValue', async (value) => {
          const lux = Math.pow(10, (value - 1) / 10000);
          this.log('[BULB] Illuminance:', lux, 'lux');
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'measure_luminance'} = ${lux}`);
            try {
              await this.setCapabilityValue('measure_luminance', lux);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_luminance'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_luminance'}`, err.message);
              throw err;
            }
          })().catch(this.error);
        });
      }

      // Motion detection via IAS Zone (cluster 1280)
      if (endpoint?.clusters?.iasZone) {
        // Enroll IAS Zone first - use ZigbeeHelpers for robust IEEE address retrieval
        try {
          const ieeeAddress = await this.getIeeeAddress();
          if (ieeeAddress) {
            await endpoint.clusters.iasZone.writeAttributes({
              iasCieAddr: ieeeAddress
            }).catch(err => this.log('IAS enrollment (non-critical):', err.message));
            this.log('[OK] IAS Zone enrolled with IEEE:', ieeeAddress);
          } else {
            this.log('[WARN]  IAS enrollment skipped: IEEE address not available');
          }
        } catch (err) {
          this.log('IAS enrollment error:', err.message);
        }

        // Zone notifications (motion detection)
        endpoint.clusters.iasZone.onZoneStatusChangeNotification = async (data) => {
          this.log('🚶 Motion detected:', data);
          const motion = !!(data.zoneStatus & 1);
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_motion'} = ${motion}`);
            try {
              await this.setCapabilityValue('alarm_motion', motion);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_motion'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_motion'}`, err.message);
              throw err;
            }
          })().catch(this.error);
        };

        // Attribute listener (backup)
        endpoint.clusters.iasZone.onZoneStatus = async (value) => {
          this.log('🚶 Motion status:', value);
          const motion = !!(value & 1);
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_motion'} = ${motion}`);
            try {
              await this.setCapabilityValue('alarm_motion', motion);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_motion'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_motion'}`, err.message);
              throw err;
            }
          })().catch(this.error);
        };
      }

      // Configure reporting intervals (numbers only)
      await this.configureAttributeReporting([
        { endpointId: 1, cluster: 1026, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1029, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1, attributeName: 'batteryPercentageRemaining', minInterval: 3600, maxInterval: 43200, minChange: 2 },
        { endpointId: 1, cluster: 1024, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 100 }
      ]).catch(err => this.log('Configure reporting (non-critical):', err.message));

      this.log('[OK] Attribute reporting configured');

    } catch (err) {
      this.error('Attribute reporting setup failed:', err);
    }
  }

}

module.exports = PresenceSensorRadarDevice;
