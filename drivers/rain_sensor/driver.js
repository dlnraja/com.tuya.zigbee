'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.580: CRITICAL FIX - Flow card run listeners were missing
 */
class RainSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RainSensorDriver v5.5.580 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is raining
    try {
      this.homey.flow.getDeviceConditionCard('rain_sensor_is_raining')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_water') === true;
        });
      this.log('[FLOW] ✅ rain_sensor_is_raining');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Rain intensity above
    try {
      this.homey.flow.getDeviceConditionCard('rain_sensor_rain_intensity_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const intensity = args.device.getCapabilityValue('measure_rain') || 0;
          return intensity > (args.intensity || 50);
        });
      this.log('[FLOW] ✅ rain_sensor_rain_intensity_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  Rain sensor flow cards registered');
  }
}

module.exports = RainSensorDriver;
