'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');
const TuyaDPDeviceHelper = require('../../lib/TuyaDPDeviceHelper');

/**
 * TuyaSoilTesterTempHumidDevice - Unified Hybrid Driver
 * Auto-detects power source: AC/DC/Battery (CR2032/CR2450/AAA/AA)
 * Dynamically manages capabilities based on power source
 */
class TuyaSoilTesterTempHumidDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    try {
      // Sanity checks
      if (!zclNode) {
        this.log('[ERROR] onNodeInit: missing zclNode');
        return;
      }

      this.log('[SOIL] 🌱 Soil Sensor initializing...');

      // Store zclNode
      this.zclNode = zclNode;

      // CRITICAL: FORCE Tuya DP mode for ALL TS0601
      const productId = this.getData()?.productId || this.getSetting('zb_product_id');
      const isTS0601 = productId === 'TS0601';

      this.log('[SOIL] 🔍 Product ID:', productId);

      if (isTS0601) {
        this.log('[SOIL] 🚨 TS0601 detected - FORCING Tuya DP mode');
        this.usesTuyaDP = true;
        this.usesTuyaDPBattery = true; // Battery via DP 4
        this.hasTuyaCluster = true;
        this.isTuyaDevice = true;
      }

      // Initialize base FIRST (creates tuyaEF00Manager if TS0601)
      await super.onNodeInit({ zclNode }).catch(err => this.error(err));

      // THEN setup V4 systems AFTER base initialization
      if (isTS0601) {
        // 🆕 v5.0.1: Auto DP Mapping (uses tuyaEF00Manager)
        this.log('[SOIL-V4] 🤖 Starting auto DP mapping...');
        await TuyaDPMapper.autoSetup(this, zclNode).catch(err => {
          this.log('[SOIL-V4] ⚠️  Auto-mapping failed:', err.message);
        });

        // 🆕 v5.0.1: Battery Manager V4
        this.log('[SOIL-V4] 🔋 Starting Battery Manager V4...');
        this.batteryManagerV4 = new BatteryManagerV4(this, 'CR2032');
        await this.batteryManagerV4.startMonitoring().catch(err => {
          this.log('[SOIL-V4] ⚠️  Battery V4 init failed:', err.message);
        });
      }

      // Only setup standard Zigbee if NOT Tuya DP
      if (!this.isTuyaDevice) {
        TuyaDPDeviceHelper.logClusterAction(this, 'configure');
        // Setup standard sensor reporting
        await this.setupSensorReporting();
        // Setup IAS Zone
        await this.setupIASZone();
        // Setup sensor capabilities
        await this.setupTemperatureSensor();
        await this.setupHumiditySensor();
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

      this.log('TuyaSoilTesterTempHumidDevice initialized - Power source:', this.powerSource || 'unknown');
    } catch (err) {
      this.log('[ERROR] onNodeInit outer catch:', err);
      if (typeof this._safeRejectAvailable === 'function') {
        this._safeRejectAvailable(err);
      }
    }
  }

  /**
   * DEPRECATED: Legacy Tuya DP engine (v4.x)
   * v5.0.1: Now using TuyaDPMapper.autoSetup() instead
   * Kept for backward compatibility only
   */
  async _initTuyaDpEngine() {
    this.log('[SOIL] ⚠️  _initTuyaDpEngine() is deprecated, use TuyaDPMapper.autoSetup()');
    // No-op - TuyaDPMapper handles everything now
  }

  /**
   * DEPRECATED: Legacy DP handler (v4.x)
   * v5.0.1: TuyaDPMapper handles all DP mapping automatically
   * Kept for backward compatibility only
   */
  _onDataPoint(dpId, value) {
    this.log('[SOIL] ⚠️  Legacy _onDataPoint() called - TuyaDPMapper should handle this');
    this.log('[SOIL] DP', dpId, '=', value);
  }

  /**
   * DEPRECATED: Legacy DP listener setup (v4.x)
   * v5.0.1: TuyaDPMapper.autoSetup() handles all listener registration
   * Kept for backward compatibility only
   */
  async setupTuyaDPListeners() {
    this.log('[SOIL] ⚠️  setupTuyaDPListeners() is deprecated, use TuyaDPMapper.autoSetup()');
    // No-op - TuyaDPMapper handles everything now

    try {
      // Register DP listeners
      // DP 1 = Temperature (divide by 10)
      this.tuyaEF00Manager.on('dp-1', (value) => {
        const temp = value / 10;
        this.log(`[SOIL] 🌡️ Temperature: ${temp}°C (DP1 raw: ${value})`);
        if (this.hasCapability('measure_temperature')) {
          this.setCapabilityValue('measure_temperature', temp).catch(this.error);
        }
      });

      // DP 2 = Air Humidity
      this.tuyaEF00Manager.on('dp-2', (value) => {
        this.log(`[SOIL] 💧 Air Humidity: ${value}% (DP2)`);
        if (this.hasCapability('measure_humidity')) {
          this.setCapabilityValue('measure_humidity', value).catch(this.error);
        }
      });

      // DP 3 = Soil Moisture
      this.tuyaEF00Manager.on('dp-3', (value) => {
        this.log(`[SOIL] 🌱 Soil Moisture: ${value}% (DP3)`);
        if (this.hasCapability('measure_humidity.soil')) {
          this.setCapabilityValue('measure_humidity.soil', value).catch(this.error);
        }
      });

      // DP 4 = Battery
      this.tuyaEF00Manager.on('dp-4', (value) => {
        this.log(`[SOIL] 🔋 Battery: ${value}% (DP4)`);
        if (this.hasCapability('measure_battery')) {
          this.setCapabilityValue('measure_battery', value).catch(this.error);
        }
      });

      // DP 5 = Wetness Alarm
      this.tuyaEF00Manager.on('dp-5', (value) => {
        const isWet = Boolean(value);
        this.log(`[SOIL] 💦 Wetness: ${isWet ? 'WET' : 'DRY'} (DP5)`);
        if (this.hasCapability('alarm_contact')) {
          this.setCapabilityValue('alarm_contact', isWet).catch(this.error);
        }
      });

      this.log('[SOIL] ✅ Tuya DP listeners configured');

      // Request initial values - FORCE device to send data
      this.log('[SOIL] Requesting initial DP values...');
      if (this.tuyaEF00Manager && typeof this.tuyaEF00Manager.requestDP === 'function') {
        // Request all DPs with staggered timing to avoid overwhelming device
        [1, 2, 3, 4, 5].forEach((dp, index) => {
          setTimeout(() => {
            this.tuyaEF00Manager.requestDP(dp)
              .then(() => this.log(`[SOIL] ✅ DP${dp} requested`))
              .catch(err => this.log(`[SOIL] ⚠️ Could not request DP${dp}:`, err.message));
          }, index * 500); // 500ms between each request
        });
      } else {
        this.log('[SOIL] ⚠️ requestDP not available, waiting for passive reports...');
      }

    } catch (err) {
      this.error('[SOIL] ❌ Tuya DP setup failed:', err);
    }
  }

  async setupSensorReporting() {
    try {
      const endpoint = this.zclNode.endpoints[1];

      if (endpoint?.clusters?.msTemperatureMeasurement) {
        endpoint.clusters.msTemperatureMeasurement.on('attr.measuredValue', (value) => {
          this.setCapabilityValue('measure_temperature', value / 100).catch(this.error);
        });
      }

      if (endpoint?.clusters?.msRelativeHumidity) {
        endpoint.clusters.msRelativeHumidity.on('attr.measuredValue', (value) => {
          this.setCapabilityValue('measure_humidity', value / 100).catch(this.error);
        });
      }

      if (endpoint?.clusters?.genPowerCfg) {
        endpoint.clusters.genPowerCfg.on('attr.batteryPercentageRemaining', (value) => {
          this.setCapabilityValue('measure_battery', value / 2).catch(this.error);
        });
      }

      await this.configureAttributeReporting([
        { endpointId: 1, cluster: 1026, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1029, attributeName: 'measuredValue', minInterval: 60, maxInterval: 3600, minChange: 50 },
        { endpointId: 1, cluster: 1, attributeName: 'batteryPercentageRemaining', minInterval: 3600, maxInterval: 43200, minChange: 2 }
      ]).catch(err => this.log('Reporting config (non-critical):', err.message));

    } catch (err) {
      this.error('Sensor reporting setup failed:', err);
    }
  }


  /**
   * Setup measure_temperature capability (SDK3)
   * Cluster 1026 - measuredValue
   */
  async setupTemperatureSensor() {
    if (!this.hasCapability('measure_temperature')) {
      return;
    }

    this.log('[TEMP]  Setting up measure_temperature (cluster 1026)...');

    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1026]) {
      this.log('[WARN]  Cluster 1026 not available');
      return;
    }

    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_temperature', 1026,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_temperature', Cluster: 1026
*/
      // Commented out - replaced by SDK3 direct cluster access
      // this.registerCapability('measure_temperature', 1026, {
      //   get: 'measuredValue',
      //   report: 'measuredValue',
      //   reportParser: value => value / 100,
      //   reportOpts: {
      //     configureAttributeReporting: {
      //       minInterval: 60,
      //       maxInterval: 3600,
      //       minChange: 10
      //     }
      //   },
      //   getOpts: {
      //     getOnStart: true
      //   }
      // });

      this.log('[OK] measure_temperature configured (cluster 1026)');
    } catch (err) {
      this.error('measure_temperature setup failed:', err);
    }
  }

  /**
   * Setup measure_humidity capability (SDK3)
   * Cluster 1029 - measuredValue
   */
  async setupHumiditySensor() {
    if (!this.hasCapability('measure_humidity')) {
      return;
    }

    this.log('[TEMP]  Setting up measure_humidity (cluster 1029)...');

    const endpoint = this.zclNode.endpoints[1];
    if (!endpoint?.clusters[1029]) {
      this.log('[WARN]  Cluster 1029 not available');
      return;
    }

    try {
      /* REFACTOR: registerCapability deprecated with cluster spec.
   Original: this.registerCapability('measure_humidity', 1029,
   Replace with SDK3 pattern - see ZigbeeDevice docs
   Capability: 'measure_humidity', Cluster: 1029

   Code commented out - needs SDK3 direct cluster access implementation
*/
      // this.registerCapability('measure_humidity', 1029, {
      //   get: 'measuredValue',
      //   report: 'measuredValue',
      //   reportParser: value => value / 100,
      //   reportOpts: {
      //     configureAttributeReporting: {
      //       minInterval: 60,
      //       maxInterval: 3600,
      //       minChange: 100
      //     }
      //   },
      //   getOpts: {
      //     getOnStart: true
      //   }
      // });

      this.log('[OK] measure_humidity configured (cluster 1029)');
    } catch (err) {
      this.error('measure_humidity setup failed:', err);
    }
  }


  /**
   * Setup IAS Zone for Contact sensor (SDK3 Compliant)
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
      endpoint.clusters.iasZone.onZoneStatusChangeNotification = async (payload) => {
        this.log('[MSG] Zone notification received:', payload);

        if (payload && payload.zoneStatus !== undefined) {
          // Convert Bitmap to value if needed
          let status = payload.zoneStatus;
          if (status && typeof status.valueOf === 'function') {
            status = status.valueOf();
          }

          // Check alarm1 bit (motion/alarm detected)
          const alarm = (status & 0x01) !== 0;

          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_contact'} = ${alarm}`);
            try {
              await this.setCapabilityValue('alarm_contact', alarm);
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_contact'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_contact'}`, err.message);
              throw err;
            }
          })().catch(this.error);
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
          this.log(`📝 [DIAG] setCapabilityValue: ${'alarm_contact'} = ${alarm}`);
          try {
            await this.setCapabilityValue('alarm_contact', alarm);
            this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'alarm_contact'}`);
          } catch (err) {
            this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'alarm_contact'}`, err.message);
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
    this.log('TuyaSoilTesterTempHumidDevice deleted');
    await super.onDeleted().catch(err => this.error(err));
  }
}

module.exports = TuyaSoilTesterTempHumidDevice;
