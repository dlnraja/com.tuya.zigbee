'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class EnergyMeter3phaseDriver extends ZigBeeDriver {

  async onInit() {
    this.log('EnergyMeter3phaseDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() { try {
    this.powerChangedTrigger = this.homey.flow.getDeviceTriggerCard('energy_meter_3phase_power_changed');
    this.voltageChangedTrigger = this.homey.flow.getDeviceTriggerCard('energy_meter_3phase_voltage_changed');
    this.currentChangedTrigger = this.homey.flow.getDeviceTriggerCard('energy_meter_3phase_current_changed');
    this.energyChangedTrigger = this.homey.flow.getDeviceTriggerCard('energy_meter_3phase_energy_changed');
    this.homey.flow.getDeviceConditionCard('energy_meter_3phase_power_above').registerRunListener(async (args) => {
      return (args.device.getCapabilityValue('measure_power') || 0) > args.power;
    });
    this.homey.flow.getDeviceActionCard('energy_meter_3phase_reset_meter').registerRunListener(async (args) => {
      await args.device.setCapabilityValue('meter_power', 0);
    });
    } catch (e) { this.log('Flow cards unavailable:', e.message); }
  }

}

module.exports = EnergyMeter3phaseDriver;
