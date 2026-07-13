'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UltrasonicWaterMeterDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('UltrasonicWaterMeterDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      const faultCard = this.homey.flow.getConditionCard('ultrasonic_water_meter_fault_active');
      if (faultCard) {
        faultCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_fault') === true;
        });
      }
    } catch (e) {
      this.log(`[FLOW] ultrasonic_water_meter_fault_active error: ${e.message}`);
    }

    try {
      const batteryCard = this.homey.flow.getConditionCard('ultrasonic_water_meter_battery_low');
      if (batteryCard) {
        batteryCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_battery') === true;
        });
      }
    } catch (e) {
      this.log(`[FLOW] ultrasonic_water_meter_battery_low error: ${e.message}`);
    }

    this.log('[FLOW] Ultrasonic water meter flow cards registered');
  }
}

module.exports = UltrasonicWaterMeterDriver;
