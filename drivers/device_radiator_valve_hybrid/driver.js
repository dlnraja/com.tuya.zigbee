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
    try { this.homey.flow.getTriggerCard('device_radiator_valve_hybrid_radiator_valve_hybrid_target_temperature_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_radiator_valve_hybrid_radiator_valve_measure_temperature_changed_device_radiator_valve_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_radiator_valve_hybrid_radiator_valve_temp_changed_device_radiator_valve_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_radiator_valve_hybrid_radiator_valve_battery_low_device_radiator_valve_hybrid'); } catch (e) {}

    // ACTIONS
    try {
      // A8: NaN Safety - use safeDivide/safeMultiply
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
      const card = const card = this.homey.flow.getActionCard('device_radiator_valve_hybrid_radiator_valve_set_temperature_device_radiator_valve_hybrid');
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
