'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PowerMeterDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PowerMeterDriver initialized');
    this.powerChangedTrigger = this.homey.flow.getDeviceTriggerCard('power_meter_power_changed');
    this.homey.flow.getDeviceConditionCard('power_meter_power_above').registerRunListener(async (args) => {
      return (args.device.getCapabilityValue('measure_power') || 0) > args.power;
    });
    this.homey.flow.getDeviceActionCard('power_meter_reset_meter').registerRunListener(async (args) => {
      await args.device.setCapabilityValue('meter_power', 0);
    });
  }

}

module.exports = PowerMeterDriver;
