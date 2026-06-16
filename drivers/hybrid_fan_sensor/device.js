'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');

/**
 * Hybrid Fan + Sensor Device
 *
 * For Tuya Zigbee air purifier / fan devices that ALSO expose temperature
 * and humidity sensor data. These devices have irreconcilable conflicts when
 * registered under separate fan (air_purifier_climate) or sensor (temphumidsensor) drivers.
 *
 * Class: "fan" (allows onoff + dim for fan speed in Homey UI)
 * Capabilities: onoff, dim (fan speed), measure_pm25, measure_temperature,
 *               measure_humidity, measure_battery, alarm_battery
 */
class HybridFanSensorDevice extends UnifiedSensorBase {

  get dpMappings() {
    return {
      // Fan control DPs
      1: { capability: 'onoff', divisor: 1 },
      2: { capability: 'dim', divisor: 1 },
      // Air quality
      4: { capability: 'measure_pm25', divisor: 1 },
      // Climate sensor DPs
      5: { capability: 'measure_temperature', smartDivisor: true, useInference: true },
      6: { capability: 'measure_humidity', divisor: 1, useInference: true },
      // Battery
      3: { capability: 'measure_battery', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[HYBRID_FAN_SENSOR] Initializing...');

    await super.onNodeInit({ zclNode });

    // Register fan on/off listener
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[HYBRID_FAN_SENSOR] Fan ${value ? 'ON' : 'OFF'}`);
      try {
        await this.sendTuyaDataPoint(1, value ? 1 : 0, 'value');
      } catch (err) {
        this.error(`[HYBRID_FAN_SENSOR] Failed to set onoff: ${err.message}`);
      }
    });

    // Register fan speed listener
    this.registerCapabilityListener('dim', async (value) => {
      const speed = Math.round(value * 100);
      this.log(`[HYBRID_FAN_SENSOR] Fan speed: ${speed}%`);
      try {
        await this.sendTuyaDataPoint(2, speed, 'value');
      } catch (err) {
        this.error(`[HYBRID_FAN_SENSOR] Failed to set speed: ${err.message}`);
      }
    });

    this.log('[HYBRID_FAN_SENSOR] Ready');
  }

  onTuyaDP(dpId, value, dpType) {
    this.log(`[HYBRID_FAN_SENSOR] DP${dpId} = ${value}`);

    const mapping = this.dpMappings[dpId];
    if (mapping) {
      let val;
      if (mapping.smartDivisor === true) {
        try {
          const { smartParse } = require('../../lib/managers/SmartDivisorManager');
          val = smartParse(value, dpId, {
            manufacturerName: this.getSetting('zb_manufacturer_name') || '',
            capability: mapping.capability,
            deviceId: this.getData()?.id || '',
          });
        } catch {
          val = value;
        }
      } else {
        val = value / (mapping.divisor || 1);
      }

      // Apply calibration
      if (mapping.capability === 'measure_temperature') {
        const offset = this.getSetting('temperature_calibration') || 0;
        val = val + offset;
      } else if (mapping.capability === 'measure_humidity') {
        const offset = this.getSetting('humidity_calibration') || 0;
        val = val + offset;
      }

      if (val !== null && val !== undefined) {
        return this.setCapabilityValue(mapping.capability, val).catch(() => {});
      }
    }

    return super.onTuyaDP(dpId, value, dpType);
  }
}

module.exports = HybridFanSensorDevice;
