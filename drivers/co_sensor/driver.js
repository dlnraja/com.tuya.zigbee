'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class CoSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('CoSensorDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: CO is/is not detected
    try {
      this.homey.flow.getConditionCard('co_sensor_co_detected')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_co') === true;
        });
      this.log('[FLOW] ✅ co_sensor_co_detected');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: CO level above threshold
    try {
      this.homey.flow.getConditionCard('co_sensor_co_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const level = args.device.getCapabilityValue('measure_co') || 0;
          return level > (args.ppm || 50);
        });
      this.log('[FLOW] ✅ co_sensor_co_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Battery above threshold
    try {
      this.homey.flow.getConditionCard('co_sensor_battery_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
        });
      this.log('[FLOW] ✅ co_sensor_battery_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Test alarm
    try {
      this.homey.flow.getActionCard('co_sensor_test_alarm')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          try {
            if (args.device._tuyaEF00Manager) {
              await args.device._tuyaEF00Manager.sendDatapoint(8, true, 'bool');
            }
            return true;
          } catch (err) { return true; }
        });
      this.log('[FLOW] ✅ co_sensor_test_alarm');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 CO sensor flow cards registered');
  }
}

module.exports = CoSensorDriver;
