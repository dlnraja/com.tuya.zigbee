'use strict';

const { Driver } = require('homey');

class DinRailMeterDriver extends Driver {
  async onInit() {
    this.log('Din Rail Meter driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    this.powerChangedTrigger = this.homey.flow.getDeviceTriggerCard('din_rail_meter_power_changed');
    this.voltageChangedTrigger = this.homey.flow.getDeviceTriggerCard('din_rail_meter_voltage_changed');
    this.currentChangedTrigger = this.homey.flow.getDeviceTriggerCard('din_rail_meter_current_changed');
    this.energyChangedTrigger = this.homey.flow.getDeviceTriggerCard('din_rail_meter_energy_changed');
    this.homey.flow.getDeviceConditionCard('din_rail_meter_power_above').registerRunListener(async (args) => {
      return (args.device.getCapabilityValue('measure_power') || 0) > args.power;
    });
    this.homey.flow.getDeviceActionCard('din_rail_meter_reset_meter').registerRunListener(async (args) => {
      await args.device.setCapabilityValue('meter_power', 0);
    });
  }
}

module.exports = DinRailMeterDriver;
