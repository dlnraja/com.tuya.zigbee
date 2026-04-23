'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');

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
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }

    await super.onNodeInit({ zclNode });

    const ep1 = zclNode?.endpoints?.[1];

    // Standard illuminance measurement cluster (0x0400)
    const illum = ep1?.clusters?.illuminanceMeasurement || ep1?.clusters?.[1024];
    if (illum?.on) {
      illum.on('attr.measuredValue', (val) => {
        const lux = Math.pow(10, val - 1 * 10000 );
        this.setCapabilityValue('measure_luminance', Math.round(lux);
      });
    }

    // v5.13.20: Assign dpMappings directly to device for EF00Manager visibility
    this.dpMappings = {
      1: { capability: 'measure_luminance', divisor: 1 },
      4: { capability: 'measure_battery', divisor: 1 },
    };

    // Battery via power configuration
    const power = ep1?.clusters?.powerConfiguration || ep1?.clusters?.[1];
    if (power?.on) {
      power.on('attr.batteryPercentageRemaining', (val) => {
        const pct = Math.min(100, Math.round(val);
        this.setCapabilityValue('measure_battery', pct).catch(() => {});
      });
    }

    this.log('[LIGHT-OUT] \u2705 Ready' );
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }

  /**
   * v7.4.6: Refresh state when device announces itself (rejoin/wakeup)
   */
  async onEndDeviceAnnounce() {
    this.log('[REJOIN] Device announced itself, refreshing state...');
    if (typeof this._updateLastSeen === 'function') this._updateLastSeen();
    // Proactive data recovery if supported
    if (this._dataRecoveryManager) {
       this._dataRecoveryManager.triggerRecovery();
    }
  }
}
module.exports = LightSensorOutdoorDevice;

