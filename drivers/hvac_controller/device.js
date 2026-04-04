'use strict';
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * HVAC Controller - TS0601
 * For VRV/VRF systems (Daikin compatible)
 * DPs: DP1=onoff, DP2=target_temp, DP3=current_temp,
 *       DP4=mode (0=cool,1=heat,2=auto), DP5=fan_speed
 */
class HVACControllerDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) {
    // --- Attribute Reporting Configuration (auto-generated) ---
    try {
      await this.configureAttributeReporting([
        {
          cluster: 'msTemperatureMeasurement',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 50,
        }
      ]);
      this.log('Attribute reporting configured successfully');
    } catch (err) {
      this.log('Attribute reporting config failed (device may not support it):', err.message);
    }


    const MODE_MAP = { 0: 'cool', 1: 'heat', 2: 'auto' };
    const MODE_MAP_REV = { 'cool': 0, 'heat': 1, 'auto': 2, 'off': 0 };

    if (this._tuyaEF00Manager) {
      this._tuyaEF00Manager.dpMappings = {
        1: { capability: 'onoff', converter: v => !!v },
        2: { capability: 'target_temperature', divisor: 10 },
        3: { capability: 'measure_temperature', divisor: 10 },
        4: { capability: 'thermostat_mode', converter: v => MODE_MAP[v] || 'auto' },
      };
    }

    this.registerCapabilityListener('onoff', async (value) => {
      this._markAppCommand?.();
      if (this._tuyaEF00Manager) {
        await this._tuyaEF00Manager.sendTuyaDP(1, 1, value ? 1 : 0);
      }
    });

    this.registerCapabilityListener('target_temperature', async (value) => {
      this._markAppCommand?.();
      if (this._tuyaEF00Manager) {
        await this._tuyaEF00Manager.sendTuyaDP(2, 2, Math.round(value * 10));
      }
    });

    this.registerCapabilityListener('thermostat_mode', async (value) => {
      this._markAppCommand?.();
      if 

      (value === 'off') {
        await this._tuyaEF00Manager?.sendTuyaDP(1, 1, 0);
      } else {
        await this._tuyaEF00Manager?.sendTuyaDP(1, 1, 1);
        await this._tuyaEF00Manager?.sendTuyaDP(4, 4, MODE_MAP_REV[value] ?? 2);
      }
    });

    this.log('[HVAC] \u2705 Ready');
  }
}
module.exports = HVACControllerDevice;


