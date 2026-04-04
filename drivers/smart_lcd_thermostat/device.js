'use strict';
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');

/**
 * Smart LCD Thermostat - TS0601
 * LCD display thermostat with weekly schedule
 * DPs: DP1=mode, DP2=target_temp, DP3=current_temp, DP4=humidity,
 *       DP6=child_lock, DP28=schedule
 */
class SmartLCDThermostatDevice extends TuyaZigbeeDevice {
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
        },
        {
          cluster: 'msRelativeHumidity',
          attributeName: 'measuredValue',
          minInterval: 30,
          maxInterval: 600,
          minChange: 100,
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
        1: { capability: 'thermostat_mode', converter: v => MODE_MAP[v] || 'auto' },
        2: { capability: 'target_temperature', divisor: 10 },
        3: { capability: 'measure_temperature', divisor: 10 },
        4: { capability: 'measure_humidity', divisor: 1 },
      };
    }

    this.registerCapabilityListener('target_temperature', async (value) => {
      this._markAppCommand?.();
      if (this._tuyaEF00Manager) {
        await this._tuyaEF00Manager.sendTuyaDP(2, 2, Math.round(value * 10));
      }
    });

    this.registerCapabilityListener('thermostat_mode', async (value) => {
      this._markAppCommand?.();
      if 

      (this._tuyaEF00Manager) {
        await this._tuyaEF00Manager.sendTuyaDP(1, 4, MODE_MAP_REV[value] ?? 0);
      }
    });

    this.log('[LCD-THERMO] \u2705 Ready');
  }


  async onDeleted() {
    this.log('Device deleted, cleaning up');
  }
}
module.exports = SmartLCDThermostatDevice;


