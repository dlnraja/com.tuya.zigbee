'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RadiatorValveDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('RadiatorValveDriver v5.5.572 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    this.log('[FLOW] RadiatorValveDriver flow cards initializing');

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_hybrid_radiator_valve_set_target_temperature_device_radiator_valve_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('target_temperature', args.temperature || args.value).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_radiator_valve_hybrid_radiator_valve_set_target_temperature_device_radiator_valve_hybrid: ${err.message}`); }

    try {
      const card = this.homey.flow.getActionCard('device_radiator_valve_hybrid_radiator_valve_set_temperature_device_radiator_valve_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('target_temperature', args.temperature || args.value).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action device_radiator_valve_hybrid_radiator_valve_set_temperature_device_radiator_valve_hybrid: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = RadiatorValveDriver;
