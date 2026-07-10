'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class EnergyMeterDinDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('EnergyMeterDinDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const triggers = ['energy_meter_din_turned_on', 'energy_meter_din_turned_off'];
    for (const id of triggers) {
      try {
        this.homey.flow.getDeviceTriggerCard(id);
      } catch (e) {
        this.error(`Trigger ${id} registration error: ${e.message}`);
      }
    }

    try {
      const powerCard = this.homey.flow.getConditionCard('energy_meter_din_power_above');
      if (powerCard) {
        powerCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          const power = args.device.getCapabilityValue('measure_power') || 0;
          return power > (args.threshold || 100);
        });
      }
    } catch (e) {
      this.log(`[FLOW] energy_meter_din_power_above error: ${e.message}`);
    }

    this.log('[FLOW] Energy meter DIN flow cards registered');
  }
}

module.exports = EnergyMeterDinDriver;
