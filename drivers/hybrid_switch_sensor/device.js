'use strict';

const UnifiedSensorBase = require('../../lib/devices/UnifiedSensorBase');
const UnifiedSwitchBase = require('../../lib/devices/UnifiedSwitchBase');
const VirtualButtonMixin = require('../../lib/mixins/VirtualButtonMixin');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');

/**
 * Hybrid Switch + Sensor Device
 *
 * For Tuya Zigbee devices that function as BOTH a switch/plug AND a
 * climate sensor (temperature + humidity). These devices have irreconcilable
 * conflicts when registered under separate sensor or switch drivers.
 *
 * Class: "socket" (allows onoff + energy monitoring in Homey UI)
 * Capabilities: onoff, measure_temperature, measure_humidity, measure_battery, alarm_battery
 *
 * The device dynamically detects its protocol mode (Tuya DP vs ZCL) and
 * exposes both switch control and climate sensor readings from a single
 * driver instance.
 */
class HybridSwitchSensorDevice extends PhysicalButtonMixin(VirtualButtonMixin(UnifiedSwitchBase)) {

  get gangCount() { return 1; }

  get dpMappings() {
    return {
      // Switch DPs
      1: { capability: 'onoff', divisor: 1 },
      // Sensor DPs
      2: { capability: 'measure_temperature', smartDivisor: true, useInference: true },
      3: { capability: 'measure_humidity', divisor: 1, useInference: true },
      4: { capability: 'measure_battery', divisor: 1 },
      // Energy monitoring DPs (for plug variants)
      17: { capability: 'measure_current', smartDivisor: true, unit: 'A' },
      18: { capability: 'measure_power', smartDivisor: true, unit: 'W' },
      19: { capability: 'measure_voltage', smartDivisor: true, unit: 'V' },
      20: { capability: 'meter_power', smartDivisor: true, unit: 'kWh' }
    };
  }

  async onNodeInit({ zclNode }) {
    this.log('[HYBRID_SWITCH_SENSOR] Initializing...');

    // Initialize parent (UnifiedSwitchBase handles Tuya DP + ZCL routing)
    await super.onNodeInit({ zclNode });

    // Register temperature calibration listener
    this.registerCapabilityListener('measure_temperature', async (value) => {
      const offset = this.getSetting('temperature_calibration') || 0;
      return value + offset;
    });

    this.log('[HYBRID_SWITCH_SENSOR] Ready');
  }

  onTuyaDP(dpId, value, dpType) {
    this.log(`[HYBRID_SWITCH_SENSOR] DP${dpId} = ${value}`);

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

      // Apply calibration for sensor readings
      if (mapping.capability === 'measure_temperature') {
        const offset = this.getSetting('temperature_calibration') || 0;
        val = val + offset;
      } else if (mapping.capability === 'measure_humidity') {
        const offset = this.getSetting('humidity_calibration') || 0;
        val = val + offset;
      }

      if (val !== null && val !== undefined) {
        return this.safeSetCapabilityValue(mapping.capability, val).catch(() => {});
      }
    }

    // Fallback to parent
    return super.onTuyaDP(dpId, value, dpType);
  }
}

module.exports = HybridSwitchSensorDevice;
