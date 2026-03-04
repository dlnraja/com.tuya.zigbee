'use strict';

const { Driver } = require('homey');

class PowerClampMeterDriver extends Driver {
  async onInit() {
    this.log('Power Clamp Meter driver initialized');
    this.powerChangedTrigger = this.homey.flow.getDeviceTriggerCard('power_clamp_meter_power_changed');
    this.homey.flow.getDeviceConditionCard('power_clamp_meter_power_above').registerRunListener(async (args) => {
      return (args.device.getCapabilityValue('measure_power') || 0) > args.power;
    });
    this.homey.flow.getDeviceActionCard('power_clamp_meter_reset_meter').registerRunListener(async (args) => {
      await args.device.setCapabilityValue('meter_power', 0);
    });
  }
}

module.exports = PowerClampMeterDriver;
