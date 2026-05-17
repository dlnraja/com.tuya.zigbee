'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class WaterLeakSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WaterLeakSensorDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Water is/is not detected
    try {
      const waterDetectedCard = this.homey.flow.getConditionCard('water_leak_sensor_water_detected');
      if (waterDetectedCard) {
        waterDetectedCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_water') === true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] water_leak_sensor_water_detected error: ${err.message}`);
    }

    // CONDITION: Battery above threshold
    try {
      const batteryAboveCard = this.homey.flow.getConditionCard('water_leak_sensor_battery_above');
      if (batteryAboveCard) {
        batteryAboveCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
        });
      }
    } catch (err) {
      this.log(`[FLOW] water_leak_sensor_battery_above error: ${err.message}`);
    }

    this.log('[FLOW] Water leak sensor flow cards registered');
  }
}

module.exports = WaterLeakSensorDriver;
