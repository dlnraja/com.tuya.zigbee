'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SoilSensorEcDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('SoilSensorEcDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      const conductivityCard = this.homey.flow.getConditionCard('soil_sensor_ec_conductivity_above');
      if (conductivityCard) {
        conductivityCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          const ec = args.device.getCapabilityValue('measure_conductivity') || 0;
          return ec > (args.threshold || 500);
        });
      }
    } catch (e) {
      this.log(`[FLOW] soil_sensor_ec_conductivity_above error: ${e.message}`);
    }

    try {
      const batteryCard = this.homey.flow.getConditionCard('soil_sensor_ec_battery_above');
      if (batteryCard) {
        batteryCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
        });
      }
    } catch (e) {
      this.log(`[FLOW] soil_sensor_ec_battery_above error: ${e.message}`);
    }

    this.log('[FLOW] Soil EC sensor flow cards registered');
  }
}

module.exports = SoilSensorEcDriver;
