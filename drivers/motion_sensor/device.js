'use strict';

const { HybridSensorBase } = require('../../lib/devices');

/**
 * Motion Sensor Device - v5.5.86 MULTISENSOR 4-IN-1 SUPPORT
 * Extends HybridSensorBase for automatic EF00/ZCL handling
 *
 * v5.5.86: Added temperature + humidity for 4-in-1 multisensors
 * Supports: Fantem ZB003-x, Immax 07502L, Generic Tuya Multisensor
 * Source: https://community.home-assistant.io/t/tuya-zigbee-multi-sensor-4-in-1/409780
 */
class MotionSensorDevice extends HybridSensorBase {

  get mainsPowered() { return false; }

  /**
   * v5.5.86: FULL 4-IN-1 SUPPORT
   * Added measure_temperature + measure_humidity for multisensors
   */
  get sensorCapabilities() {
    return ['alarm_motion', 'measure_battery', 'measure_luminance', 'measure_temperature', 'measure_humidity'];
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
      // v5.5.86: TEMPERATURE (for 4-in-1 multisensors)
      // Fantem ZB003-x, Immax 07502L use these DPs
      // ═══════════════════════════════════════════════════════════════════
      5: { capability: 'measure_temperature', divisor: 10 },   // Standard temp DP
      18: { capability: 'measure_temperature', divisor: 10 },  // Alternative temp DP
      103: { capability: 'measure_temperature', divisor: 10 }, // Fantem temp DP

      // ═══════════════════════════════════════════════════════════════════
      // v5.5.86: HUMIDITY (for 4-in-1 multisensors)
      // ═══════════════════════════════════════════════════════════════════
      6: { capability: 'measure_humidity', divisor: 1 },       // Standard humidity DP
      19: { capability: 'measure_humidity', divisor: 1 },      // Alternative humidity DP
      104: { capability: 'measure_humidity', divisor: 1 },     // Fantem humidity DP

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
      // Temperature cluster (0x0402)
      temperatureMeasurement: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const temp = Math.round((data.measuredValue / 100) * 10) / 10;
            this.log(`[ZCL] 🌡️ Temperature: ${temp}°C`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_temperature', temp).catch(() => { });
          }
        }
      },

      // Humidity cluster (0x0405)
      relativeHumidity: {
        attributeReport: (data) => {
          if (data.measuredValue !== undefined) {
            const hum = Math.round(data.measuredValue / 100);
            this.log(`[ZCL] 💧 Humidity: ${hum}%`);
            this._registerZigbeeHit?.();
            this.setCapabilityValue('measure_humidity', hum).catch(() => { });
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
    await super.onNodeInit({ zclNode });

    // v5.5.18: Explicit IAS Zone setup for HOBEIAN and other non-Tuya motion sensors
    await this._setupMotionIASZone(zclNode);

    this.log('[MOTION] ✅ Motion sensor ready');
    this.log('[MOTION] Manufacturer:', this.getSetting('zb_manufacturer_name') || 'unknown');
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
      };

      // Attribute listener for zone status
      iasCluster.on('attr.zoneStatus', (status) => {
        const motion = (status & 0x01) !== 0 || (status & 0x02) !== 0;
        this.log(`[ZCL-DATA] motion_sensor.zone_status raw=${status} → alarm_motion=${motion}`);

        if (this.hasCapability('alarm_motion')) {
          this.setCapabilityValue('alarm_motion', motion).catch(this.error);
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
}

module.exports = MotionSensorDevice;
