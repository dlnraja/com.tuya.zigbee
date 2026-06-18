'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class BoilerSwitchEnergyDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('BoilerSwitchEnergyDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const triggers = ['boiler_switch_energy_turned_on', 'boiler_switch_energy_turned_off'];
    for (const id of triggers) {
      try {
        this.homey.flow.getDeviceTriggerCard(id);
      } catch (e) {
        this.error(`Trigger ${id} registration error: ${e.message}`);
      }
    }

    try {
      const tempCard = this.homey.flow.getConditionCard('boiler_switch_energy_temperature_above');
      if (tempCard) {
        tempCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          const temp = args.device.getCapabilityValue('measure_temperature') || 0;
          return temp > (args.threshold || 50);
        });
      }
    } catch (e) {
      this.log(`[FLOW] boiler_switch_energy_temperature_above error: ${e.message}`);
    }

    try {
      const powerCard = this.homey.flow.getConditionCard('boiler_switch_energy_power_above');
      if (powerCard) {
        powerCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power > (args.threshold || 1000);
        });
      }
    } catch (e) {
      this.log(`[FLOW] boiler_switch_energy_power_above error: ${e.message}`);
    }

    this.log('[FLOW] Boiler switch energy flow cards registered');
  }
}

module.exports = BoilerSwitchEnergyDriver;
