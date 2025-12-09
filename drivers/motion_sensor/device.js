'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Motion Sensor Device - HybridSensorBase implementation
 *
 * v5.5.107: TEMPERATURE FIX (Peter's diagnostic report)
 * - Force add temp/humidity capabilities if clusters detected
 * - Improved cluster detection with multiple name variants
 * - Read temp/humidity on EVERY wake event, not just motion
 *
 * v5.5.104: CRITICAL FIX for 4-in-1 Multisensors (Peter's bug)
 * - Read temp/humidity WHEN device is awake (after motion detection)
 * - Configure reporting for passive updates
 * - These sleepy devices don't respond to queries when sleeping!
 *
 * v5.5.86: Added temperature + humidity for 4-in-1 multisensors
 * Supports: Fantem ZB003-x, Immax 07502L, Generic Tuya Multisensor
 * Source: https://community.home-assistant.io/t/tuya-zigbee-multi-sensor-4-in-1/409780
 */
class MotionSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  /**
   * v5.5.113: Only include CORE capabilities by default
   * Temperature and humidity are added dynamically if clusters are detected
   * This fixes the "incorrect labels" issue (Cam's report #604)
   */
  get sensorCapabilities() {
    // Core capabilities only - temp/humidity added dynamically if detected
    return [
      'alarm_motion',
      'measure_battery',
      'measure_luminance',
    ];
  }

  /**
   * v5.5.86: ENHANCED DP MAPPINGS
   * Added temperature/humidity DPs for Fantem ZB003-x and similar 4-in-1 sensors
   * Source: Zigbee2MQTT device definitions
   */
  get dpMappings() {
    return {
      // ═══════════════════════════════════════════════════════════════════
      // MOTION / OCCUPANCY
      // ═══════════════════════════════════════════════════════════════════
      1: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },
      101: { capability: 'alarm_motion', transform: (v) => v === 1 || v === true },  // Alternative PIR DP

      // ═══════════════════════════════════════════════════════════════════
      // BATTERY
      // ═══════════════════════════════════════════════════════════════════
      2: { capability: 'measure_battery', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 },
      15: { capability: 'measure_battery', divisor: 1 },

      // ═══════════════════════════════════════════════════════════════════
      // LUMINANCE (LUX)
      // ═══════════════════════════════════════════════════════════════════
      3: { capability: 'measure_luminance', divisor: 1 },
      9: { capability: 'measure_luminance', divisor: 1 },
      12: { capability: 'measure_luminance', divisor: 1 },
      102: { capability: 'measure_luminance', divisor: 1 },  // Fantem lux

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.107: TEMPERATURE (for 4-in-1 multisensors) - with validation
      // Fantem ZB003-x, Immax 07502L use these DPs
      // NOTE: transform is applied AFTER divisor, so values are in °C
      // ═══════════════════════════════════════════════════════════════════
      5: {
        capability: 'measure_temperature',
        divisor: 10,
        transform: (v) => (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null
      },
      18: {
        capability: 'measure_temperature',
        divisor: 10,
        transform: (v) => (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null
      },
      103: {
        capability: 'measure_temperature',
        divisor: 10,
        transform: (v) => (v >= -40 && v <= 80) ? Math.round(v * 10) / 10 : null
      },

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.107: HUMIDITY (for 4-in-1 multisensors) - with validation
      // ═══════════════════════════════════════════════════════════════════
      6: {
        capability: 'measure_humidity',
        divisor: 1,
        transform: (v) => (v >= 0 && v <= 100) ? Math.round(v) : null
      },
      19: {
        capability: 'measure_humidity',
        divisor: 1,
        transform: (v) => (v >= 0 && v <= 100) ? Math.round(v) : null
      },
      104: {
        capability: 'measure_humidity',
        divisor: 1,
        transform: (v) => (v >= 0 && v <= 100) ? Math.round(v) : null
      },

      // ═══════════════════════════════════════════════════════════════════
      // SETTINGS (not capabilities)
      // ═══════════════════════════════════════════════════════════════════
      105: { capability: null }, // Sensitivity setting
      106: { capability: null }, // Keep time setting
      107: { capability: null }, // Calibration
      108: { capability: null }, // Reporting interval
    };
  }

  /**
   * v5.5.86: ZCL cluster handlers for 4-in-1 multisensors
   * These sensors report via standard ZCL clusters (0x0402, 0x0405)
   */
  get clusterHandlers() {
    return {
      // Temperature cluster (0x0402) - v5.5.107: Add sanity check
      temperatureMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined && data.measuredValue !== -32768) {
            const temp = Math.round((data.measuredValue / 100) * 10) / 10;
            // v5.5.107: Sanity check - ignore extreme values
            if (temp >= -40 && temp <= 80) {
              this.log(`[ZCL] 🌡️ Temperature: ${temp}°C (raw: ${data.measuredValue})`);
              this._registerZigbeeHit?.();
              this._lastTempSource = 'ZCL';
              this.setCapabilityValue('measure_temperature', temp).catch(() => { });
            } else {
              this.log(`[ZCL] ⚠️ Temperature out of range: ${temp}°C (raw: ${data.measuredValue})`);
            }
          }
        }
      },

      // Humidity cluster (0x0405) - v5.5.107: Add sanity check
      relativeHumidity: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined && data.measuredValue !== 65535) {
            const hum = Math.round(data.measuredValue / 100);
            // v5.5.107: Sanity check - ignore extreme values
            if (hum >= 0 && hum <= 100) {
              this.log(`[ZCL] 💧 Humidity: ${hum}% (raw: ${data.measuredValue})`);
              this._registerZigbeeHit?.();
              this._lastHumSource = 'ZCL';
              this.setCapabilityValue('measure_humidity', hum).catch(() => { });
            } else {
              this.log(`[ZCL] ⚠️ Humidity out of range: ${hum}% (raw: ${data.measuredValue})`);
            }
          }
        }
      },

      // Illuminance cluster (0x0400)
      illuminanceMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const lux = Math.round(Math.pow(10, (data.measuredValue - 1) / 10000));
            this.log(`[ZCL] 💡 Luminance: ${lux} lux`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_luminance', lux).catch(() => { });
          }
        }
      },

      // Battery cluster (0x0001)
      powerConfiguration: {
        attributeReport: (data) => {
          if (data.batteryPercentageRemaining !== undefined) {
            const battery = Math.round(data.batteryPercentageRemaining / 2);
            this.log(`[ZCL] 🔋 Battery: ${battery}%`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_battery', battery).catch(() => { });
          }
        }
      }
    };
  }

  async onNodeInit({ zclNode }) {
    // v5.5.113: Detect available clusters BEFORE super.onNodeInit
    // This adds temp/humidity capabilities only if clusters exist
    await this._detectAvailableClusters(zclNode);

    await super.onNodeInit({ zclNode });

    // v5.5.18: Explicit IAS Zone setup for HOBEIAN and other non-Tuya motion sensors
    await this._setupMotionIASZone(zclNode);

    this.log('[MOTION] ✅ Motion sensor ready');
    this.log('[MOTION] Manufacturer:', this.getSetting('zb_manufacturer_name') || 'unknown');
    this.log(`[MOTION] Clusters: temp=${this._hasTemperatureCluster}, hum=${this._hasHumidityCluster}`);
  }

  /**
   * v5.5.113: Cluster detection AND dynamic capability addition
   * Only add temp/humidity capabilities if device actually has these clusters
   * Fixes "incorrect labels" issue (Cam's report #604)
   */
  async _detectAvailableClusters(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    const clusters = ep1?.clusters || {};
    const clusterNames = Object.keys(clusters);

    this.log(`[MOTION-CLUSTERS] Available clusters: ${clusterNames.join(', ')}`);

    // Check for temperature cluster (0x0402) - ALL possible names
    this._hasTemperatureCluster = !!(
      clusters.temperatureMeasurement ||
      clusters.msTemperatureMeasurement ||
      clusters.genTemperatureMeasurement ||
      clusters[0x0402] ||
      clusters['0x0402'] ||
      clusters['1026']
    );

    // Check for humidity cluster (0x0405) - ALL possible names
    this._hasHumidityCluster = !!(
      clusters.relativeHumidity ||
      clusters.relativeHumidityMeasurement ||
      clusters.msRelativeHumidity ||
      clusters.genRelativeHumidity ||
      clusters[0x0405] ||
      clusters['0x0405'] ||
      clusters['1029']
    );

    // v5.5.113: DYNAMICALLY add capabilities ONLY if clusters detected
    // This prevents "incorrect labels" for simple PIR motion sensors
    if (this._hasTemperatureCluster) {
      if (!this.hasCapability('measure_temperature')) {
        await this.addCapability('measure_temperature').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Added measure_temperature (cluster detected)');
      }
    }

    if (this._hasHumidityCluster) {
      if (!this.hasCapability('measure_humidity')) {
        await this.addCapability('measure_humidity').catch(() => { });
        this.log('[MOTION-CLUSTERS] ✅ Added measure_humidity (cluster detected)');
      }
    }

    this.log(`[MOTION-CLUSTERS] Temperature ZCL: ${this._hasTemperatureCluster}`);
    this.log(`[MOTION-CLUSTERS] Humidity ZCL: ${this._hasHumidityCluster}`);
  }

  /**
   * v5.5.18: Setup IAS Zone for motion detection
   * Required for HOBEIAN ZG-204ZM and similar non-Tuya sensors
   */
  async _setupMotionIASZone(zclNode) {
    try {
      const endpoint = zclNode?.endpoints?.[1];
      const iasCluster = endpoint?.clusters?.iasZone || endpoint?.clusters?.ssIasZone;

      if (!iasCluster) {
        this.log('[MOTION-IAS] No IAS Zone cluster');
        return;
      }

      this.log('[MOTION-IAS] IAS Zone cluster found - setting up motion detection');

      // Zone Status Change Notification (motion detected)
      iasCluster.onZoneStatusChangeNotification = (payload) => {
        // v5.5.17: Use universal parser from HybridSensorBase
        const parsed = this._parseIASZoneStatus(payload?.zoneStatus);
        const motion = parsed.alarm1 || parsed.alarm2;

        this.log(`[ZCL-DATA] motion_sensor.ias_zone raw=${parsed.raw} alarm1=${parsed.alarm1} alarm2=${parsed.alarm2} → motion=${motion}`);

        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        }

        // v5.5.18: Trigger flow card
        if (motion && this.driver?.motionTrigger) {
          this.driver.motionTrigger.trigger(this, {}, {}).catch(this.error);
        }

        // v5.5.104: Read temp/humidity NOW while device is awake (Peter's 4-in-1 fix)
        if (motion) {
          this._readTempHumidityWhileAwake(zclNode);
        }
      };

      // Attribute listener for zone status
      iasCluster.on('attr.zoneStatus', (status) => {
        const motion = (status & 0x01) !== 0 || (status & 0x02) !== 0;
        this.log(`[ZCL-DATA] motion_sensor.zone_status raw=${status} → alarm_motion=${motion}`);

        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
        }

        // v5.5.104: Also read temp/humidity on this event
        if (motion) {
          this._readTempHumidityWhileAwake(zclNode);
        }
      });

      // Send Zone Enroll Response
      try {
        await iasCluster.zoneEnrollResponse({
          enrollResponseCode: 0,
          zoneId: 23
        });
        this.log('[MOTION-IAS] ✅ Zone Enroll Response sent');
      } catch (e) {
        this.log('[MOTION-IAS] Zone enroll (normal if already enrolled):', e.message);
      }

      this.log('[MOTION-IAS] ✅ Motion detection via IAS Zone configured');
    } catch (err) {
      this.log('[MOTION-IAS] Setup error:', err.message);
    }
  }

  /**
   * v5.5.107: ENHANCED temp/humidity reading with ALL cluster name variants
   * This is crucial for 4-in-1 multisensors (Fantem ZB003-x, Immax 07502L)
   * which only respond to ZCL reads when awake (after motion detection)
   */
  async _readTempHumidityWhileAwake(zclNode) {
    // Debounce - don't spam reads
    if (this._lastTempHumRead && Date.now() - this._lastTempHumRead < 3000) {
      return;
    }
    this._lastTempHumRead = Date.now();

    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const clusters = ep1.clusters || {};
    this.log('[MOTION-AWAKE] 🌡️ Device awake - reading temp/humidity NOW');
    this.log(`[MOTION-AWAKE] Available clusters: ${Object.keys(clusters).join(', ')}`);

    // v5.5.107: Find temperature cluster with ALL possible names
    const tempCluster =
      clusters.temperatureMeasurement ||
      clusters.msTemperatureMeasurement ||
      clusters.genTemperatureMeasurement ||
      clusters[0x0402] ||
      clusters['0x0402'] ||
      clusters['1026'];

    if (tempCluster?.readAttributes) {
      try {
        this.log('[MOTION-AWAKE] Reading temperature cluster...');
        const data = await Promise.race([
          tempCluster.readAttributes(['measuredValue']),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
        if (data?.measuredValue !== undefined && data.measuredValue !== -32768 && data.measuredValue !== 0x8000) {
          const temp = Math.round((data.measuredValue / 100) * 10) / 10;
          this.log(`[MOTION-AWAKE] 🌡️ Temperature: ${temp}°C (raw: ${data.measuredValue})`);
          // Auto-add capability if needed
          if (!this.hasCapability('measure_temperature')) {
            await this.addCapability('measure_temperature').catch(() => { });
          }
          await this.setCapabilityValue('measure_temperature', temp).catch(() => { });
        } else {
          this.log(`[MOTION-AWAKE] Temperature invalid: ${data?.measuredValue}`);
        }
      } catch (e) {
        this.log('[MOTION-AWAKE] Temperature read failed (device may have gone to sleep):', e.message);
      }
    } else {
      this.log('[MOTION-AWAKE] No temperature cluster found');
    }

    // v5.5.107: Find humidity cluster with ALL possible names
    const humCluster =
      clusters.relativeHumidity ||
      clusters.relativeHumidityMeasurement ||
      clusters.msRelativeHumidity ||
      clusters.genRelativeHumidity ||
      clusters[0x0405] ||
      clusters['0x0405'] ||
      clusters['1029'];

    if (humCluster?.readAttributes) {
      try {
        this.log('[MOTION-AWAKE] Reading humidity cluster...');
        const data = await Promise.race([
          humCluster.readAttributes(['measuredValue']),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]);
        if (data?.measuredValue !== undefined && data.measuredValue !== 65535 && data.measuredValue !== 0xFFFF) {
          const hum = Math.round(data.measuredValue / 100);
          this.log(`[MOTION-AWAKE] 💧 Humidity: ${hum}% (raw: ${data.measuredValue})`);
          // Auto-add capability if needed
          if (!this.hasCapability('measure_humidity')) {
            await this.addCapability('measure_humidity').catch(() => { });
          }
          await this.setCapabilityValue('measure_humidity', hum).catch(() => { });
        } else {
          this.log(`[MOTION-AWAKE] Humidity invalid: ${data?.measuredValue}`);
        }
      } catch (e) {
        this.log('[MOTION-AWAKE] Humidity read failed (device may have gone to sleep):', e.message);
      }
    } else {
      this.log('[MOTION-AWAKE] No humidity cluster found');
    }

    // Also try to configure reporting for future passive updates
    this._configureReportingOnce(ep1);

    // v5.5.111: Also read battery while awake!
    await this._readBatteryWhileAwake(zclNode);
  }

  /**
   * v5.5.111: Read battery while device is awake (after motion detection)
   * Sleepy devices don't respond to queries when sleeping!
   */
  async _readBatteryWhileAwake(zclNode) {
    const ep1 = zclNode?.endpoints?.[1];
    if (!ep1) return;

    const clusters = ep1.clusters || {};

    // Find power configuration cluster
    const powerCluster =
      clusters.powerConfiguration ||
      clusters.genPowerCfg ||
      clusters[0x0001] ||
      clusters['0x0001'] ||
      clusters['1'];

    if (!powerCluster?.readAttributes) {
      this.log('[MOTION-BATTERY] No powerConfiguration cluster');
      return;
    }

    try {
      this.log('[MOTION-BATTERY] 🔋 Reading battery while device is awake...');
      const data = await Promise.race([
        powerCluster.readAttributes(['batteryPercentageRemaining', 'batteryVoltage']),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
      ]);

      if (data?.batteryPercentageRemaining !== undefined && data.batteryPercentageRemaining !== 255) {
        const battery = Math.round(data.batteryPercentageRemaining / 2);
        this.log(`[MOTION-BATTERY] 🔋 Battery: ${battery}% (raw: ${data.batteryPercentageRemaining})`);
        if (this.hasCapability('measure_battery')) {
          await this.setCapabilityValue('measure_battery', battery).catch(() => { });
        }
      } else if (data?.batteryVoltage !== undefined && data.batteryVoltage > 0) {
        // Fallback: estimate from voltage (typical CR2450: 3.0V = 100%, 2.0V = 0%)
        const voltage = data.batteryVoltage / 10;
        const battery = Math.min(100, Math.max(0, Math.round((voltage - 2.0) * 100)));
        this.log(`[MOTION-BATTERY] 🔋 Battery from voltage: ${voltage}V → ${battery}%`);
        if (this.hasCapability('measure_battery')) {
          await this.setCapabilityValue('measure_battery', battery).catch(() => { });
        }
      } else {
        this.log('[MOTION-BATTERY] Battery data invalid:', data);
      }
    } catch (e) {
      this.log('[MOTION-BATTERY] Battery read failed (device may have gone to sleep):', e.message);
    }
  }

  /**
   * v5.5.104: Configure attribute reporting (once per session)
   * This tells the device to send updates automatically
   */
  async _configureReportingOnce(endpoint) {
    if (this._reportingConfigured) return;
    this._reportingConfigured = true;

    this.log('[MOTION-REPORTING] Configuring attribute reporting for temp/humidity...');

    // Configure temperature reporting
    const tempCluster = endpoint.clusters?.temperatureMeasurement;
    if (tempCluster?.configureReporting) {
      try {
        await tempCluster.configureReporting({
          measuredValue: {
            minInterval: 60,      // Min 1 minute between reports
            maxInterval: 3600,    // Max 1 hour
            minChange: 50         // Report if change >= 0.5°C
          }
        });
        this.log('[MOTION-REPORTING] ✅ Temperature reporting configured');
      } catch (e) {
        this.log('[MOTION-REPORTING] Temperature reporting failed (device may not support)');
      }
    }

    // Configure humidity reporting
    const humCluster = endpoint.clusters?.relativeHumidity || endpoint.clusters?.relativeHumidityMeasurement;
    if (humCluster?.configureReporting) {
      try {
        await humCluster.configureReporting({
          measuredValue: {
            minInterval: 60,
            maxInterval: 3600,
            minChange: 100        // Report if change >= 1%
          }
        });
        this.log('[MOTION-REPORTING] ✅ Humidity reporting configured');
      } catch (e) {
        this.log('[MOTION-REPORTING] Humidity reporting failed (device may not support)');
      }
    }
  }
}

module.exports = MotionSensorDevice;
