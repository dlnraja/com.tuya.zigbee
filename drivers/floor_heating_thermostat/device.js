'use strict';
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Floor Heating Thermostat - TS0601
 * Underfloor heating with floor probe sensor
 * DPs: DP1=onoff, DP2=mode, DP16=target_temp, DP24=current_temp,
 *       DP101=floor_temp, DP27=child_lock
 */
class FloorHeatingThermostatDevice extends TuyaZigbeeDevice {
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


    const MODE_MAP = { 0: 'auto', 1: 'heat', 2: 'off' };
    const MODE_MAP_REV = { 'auto': 0, 'heat': 1, 'off': 2 };

    if (this._tuyaEF00Manager) {
      this._tuyaEF00Manager.dpMappings = {
        1: { capability: 'onoff', converter: v => !!v },
        2: { capability: 'thermostat_mode', converter: v => MODE_MAP[v] || 'auto' },
        16: { capability: 'target_temperature', divisor: 10 },
        24: { capability: 'measure_temperature', divisor: 10 },
        101: { capability: 'measure_temperature.floor', divisor: 10 },
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
        await this._tuyaEF00Manager.sendTuyaDP(16, 2, Math.round(value * 10));
      }
    });

    this.registerCapabilityListener('thermostat_mode', async (value) => {
      this._markAppCommand?.();
      if 

      (this._tuyaEF00Manager) {
        await this._tuyaEF00Manager.sendTuyaDP(2, 4, MODE_MAP_REV[value] ?? 0);
      }
    });

    this.log('[FLOOR-HEAT] \u2705 Ready');
  }
}
module.exports = FloorHeatingThermostatDevice;


