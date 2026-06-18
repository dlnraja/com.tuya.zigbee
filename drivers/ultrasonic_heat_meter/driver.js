'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UltrasonicHeatMeterDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('UltrasonicHeatMeterDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      const batteryCard = this.homey.flow.getConditionCard('ultrasonic_heat_meter_battery_low');
      if (batteryCard) {
        batteryCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_battery') === true;
        });
      }
    } catch (e) {
      this.log(`[FLOW] ultrasonic_heat_meter_battery_low error: ${e.message}`);
    }

    this.log('[FLOW] Ultrasonic heat meter flow cards registered');
  }
}

module.exports = UltrasonicHeatMeterDriver;
