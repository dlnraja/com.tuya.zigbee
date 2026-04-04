'use strict';
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Outdoor Light Sensor
 * Combines ZCL illuminance + Tuya DP for solar-powered outdoor sensors
 */
class LightSensorOutdoorDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msIlluminanceMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        },
        {
          cluster: 'genPowerCfg',
          attributeName: 'batteryPercentageRemaining',
          minInterval: 3600,
          maxInterval: 43200,
          minChange: 2,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    // --- Battery Alarm (auto-injected) ---
    if (this.hasCapability('measure_battery')) {
      this.registerCapabilityListener('measure_battery', async (value) => {
        if (this.hasCapability('alarm_battery')) {
          await this.setCapabilityValue('alarm_battery', value < 15).catch(() => {});
        }
      });
      // Initial check
      const bat = this.getCapabilityValue('measure_battery');
      if (bat !== null && this.hasCapability('alarm_battery')) {
        this.setCapabilityValue('alarm_battery', bat < 15).catch(() => {});
      }
    }
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });

    const ep1 = zclNode?.endpoints?.[1];

    // Standard illuminance measurement cluster (0x0400)
    const illum = ep1?.clusters?.illuminanceMeasurement || ep1?.clusters?.[1024];
    if (illum?.on) {
      illum.on('attr.measuredValue', (val) => {
        const lux = Math.pow(10, (val - 1) / 10000);
        this.setCapabilityValue('measure_luminance', Math.round(lux)).catch(() => {});
      });
    }

    // Tuya DP fallback
    if (this._tuyaEF00Manager) {
      this._tuyaEF00Manager.dpMappings = {
        1: { capability: 'measure_luminance', divisor: 1 },
        4: { capability: 'measure_battery', divisor: 1 },
      };
    }

    // Battery via power configuration
    const power = ep1?.clusters?.powerConfiguration || ep1?.clusters?.[1];
    if (power?.on) {
      power.on('attr.batteryPercentageRemaining', (val) => {
        const pct = Math.min(100, Math.round(val / 2));
        this.setCapabilityValue('measure_battery', pct).catch(() => {});
      });
    }

    this.log('[LIGHT-OUT] \u2705 Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = LightSensorOutdoorDevice;
