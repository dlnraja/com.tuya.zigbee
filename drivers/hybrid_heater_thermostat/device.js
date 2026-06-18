'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');

/**
 * Hybrid Heater + Thermostat Device
 *
 * For Tuya Zigbee devices that function as BOTH a smart heater controller AND
 * a thermostat with energy monitoring. These devices have irreconcilable conflicts
 * when registered under separate heater_controller or thermostat drivers.
 *
 * Class: "thermostat" (allows target_temperature + thermostat_mode in Homey UI)
 * Capabilities: onoff, target_temperature, measure_temperature, thermostat_mode,
 *               measure_power, meter_power, measure_voltage, measure_current
 *
 * The heater controller exposes on/off, temperature control, and energy monitoring
 * all from a single driver instance.
 */
class HybridHeaterThermostatDevice extends UnifiedSensorBase {

  get dpMappings() {
    return {
      // Heater on/off
      1: { capability: 'onoff', divisor: 1 },
      // Temperature control
      2: { capability: 'target_temperature', divisor: 1 },
      3: { capability: 'measure_temperature', smartDivisor: true, useInference: true },
      // Thermostat mode
      4: { capability: 'thermostat_mode', divisor: 1 },
      // Energy monitoring DPs
      6: { capability: 'measure_current', smartDivisor: true, unit: 'A' },
      7: { capability: 'measure_power', smartDivisor: true, unit: 'W' },
      8: { capability: 'measure_voltage', smartDivisor: true, unit: 'V' },
      9: { capability: 'meter_power', smartDivisor: true, unit: 'kWh' }
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[HYBRID_HEATER_THERMOSTAT] Initializing...');

    await super.onNodeInit({ zclNode });

    // Register heater on/off listener
    this.registerCapabilityListener('onoff', async (value) => {
      this.log(`[HYBRID_HEATER_THERMOSTAT] Heater ${value ? 'ON' : 'OFF'}`);
      try {
        await this.sendTuyaDataPoint(1, value ? 1 : 0, 'value');
      } catch (err) {
        this.error(`[HYBRID_HEATER_THERMOSTAT] Failed to set onoff: ${err.message}`);
      }
    });

    // Register target_temperature listener
    this.registerCapabilityListener('target_temperature', async (value) => {
      this.log(`[HYBRID_HEATER_THERMOSTAT] Setting target temp: ${value}°C`);
      const minSP = this.getSetting('min_set_point') || 5;
      const maxSP = this.getSetting('max_set_point') || 45;
      if (value < minSP || value > maxSP) {
        this.log(`[HYBRID_HEATER_THERMOSTAT] Set point ${value} outside range [${minSP}-${maxSP}]`);
        return;
      }
      try {
        await this.sendTuyaDataPoint(2, value, 'value');
      } catch (err) {
        this.error(`[HYBRID_HEATER_THERMOSTAT] Failed to set target temp: ${err.message}`);
      }
    });

    // Register thermostat_mode listener
    this.registerCapabilityListener('thermostat_mode', async (value) => {
      this.log(`[HYBRID_HEATER_THERMOSTAT] Setting mode: ${value}`);
      const modeMap = { 'auto': 0, 'heat': 1, 'cool': 2, 'off': 3 };
      const dpValue = modeMap[value] ?? 0;
      try {
        await this.sendTuyaDataPoint(4, dpValue, 'value');
      } catch (err) {
        this.error(`[HYBRID_HEATER_THERMOSTAT] Failed to set mode: ${err.message}`);
      }
    });

    this.log('[HYBRID_HEATER_THERMOSTAT] Ready');
  }

  onTuyaDP(dpId, value, dpType) {
    this.log(`[HYBRID_HEATER_THERMOSTAT] DP${dpId} = ${value}`);

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

      // Apply temperature calibration
      if (mapping.capability === 'measure_temperature') {
        const offset = this.getSetting('temperature_calibration') || 0;
        val = val + offset;
      }

      // Map thermostat mode from numeric to string
      if (mapping.capability === 'thermostat_mode') {
        const modes = ['auto', 'heat', 'cool', 'off'];
        val = modes[val] || 'auto';
      }

      if (val !== null && val !== undefined) {
        return this.safeSetCapabilityValue(mapping.capability, val).catch(() => {});
      }
    }

    return super.onTuyaDP(dpId, value, dpType);
  }
}

module.exports = HybridHeaterThermostatDevice;
