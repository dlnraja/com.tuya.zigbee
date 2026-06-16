'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');

/**
 * Hybrid Sensor + Thermostat Device
 *
 * For Tuya Zigbee devices that function as BOTH a climate sensor (temp + humidity)
 * AND a thermostat (set point control + mode). These devices have irreconcilable
 * conflicts when registered under separate sensor or thermostat drivers.
 *
 * Class: "thermostat" (allows target_temperature + thermostat_mode in Homey UI)
 * Capabilities: measure_temperature, measure_humidity, target_temperature,
 *               thermostat_mode, measure_battery, alarm_battery
 */
class HybridSensorThermostatDevice extends UnifiedSensorBase {

  get dpMappings() {
    return {
      1: { capability: 'measure_temperature', smartDivisor: true, useInference: true },
      2: { capability: 'measure_humidity', divisor: 1, useInference: true },
      3: { capability: 'measure_battery', divisor: 1 },
      4: { capability: 'target_temperature', divisor: 1 },
      // Tuya DP thermostat modes (common patterns)
      5: { capability: 'thermostat_mode', divisor: 1 },
      16: { capability: 'target_temperature', divisor: 1 },
      104: { capability: 'target_temperature', divisor: 1 },
      107: { capability: 'thermostat_mode', divisor: 1 }
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[HYBRID_SENSOR_THERMOSTAT] Initializing...');

    await super.onNodeInit({ zclNode });

    // Register target_temperature listener for set point commands
    this.registerCapabilityListener('target_temperature', async (value) => {
      this.log(`[HYBRID_SENSOR_THERMOSTAT] Setting target temp: ${value}°C`);
      const minSP = this.getSetting('min_set_point') || 5;
      const maxSP = this.getSetting('max_set_point') || 35;
      if (value < minSP || value > maxSP) {
        this.log(`[HYBRID_SENSOR_THERMOSTAT] Set point ${value} outside range [${minSP}-${maxSP}]`);
        return;
      }
      // Send Tuya DP set point command
      try {
        const TuyaSpecificCluster = require('../../lib/clusters/TuyaSpecificCluster');
        await this.sendTuyaDataPoint(4, value, 'value');
      } catch (err) {
        this.error(`[HYBRID_SENSOR_THERMOSTAT] Failed to set target temp: ${err.message}`);
      }
    });

    // Register thermostat_mode listener
    this.registerCapabilityListener('thermostat_mode', async (value) => {
      this.log(`[HYBRID_SENSOR_THERMOSTAT] Setting mode: ${value}`);
      const modeMap = { 'auto': 0, 'heat': 1, 'cool': 2, 'off': 3 };
      const dpValue = modeMap[value] ?? 0;
      try {
        await this.sendTuyaDataPoint(5, dpValue, 'value');
      } catch (err) {
        this.error(`[HYBRID_SENSOR_THERMOSTAT] Failed to set mode: ${err.message}`);
      }
    });

    this.log('[HYBRID_SENSOR_THERMOSTAT] Ready');
  }

  onTuyaDP(dpId, value, dpType) {
    this.log(`[HYBRID_SENSOR_THERMOSTAT] DP${dpId} = ${value}`);

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

      // Map thermostat mode from numeric to string
      if (mapping.capability === 'thermostat_mode') {
        const modes = ['auto', 'heat', 'cool', 'off'];
        val = modes[val] || 'auto';
      }

      if (val !== null && val !== undefined) {
        return this.setCapabilityValue(mapping.capability, val).catch(() => {});
      }
    }

    return super.onTuyaDP(dpId, value, dpType);
  }
}

module.exports = HybridSensorThermostatDevice;
