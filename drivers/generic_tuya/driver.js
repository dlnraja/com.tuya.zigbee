'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericTuyaDriver extends ZigBeeDriver {
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
    this.log('Generic Tuya Driver v5.5.583 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('generic_tuya_measure_temperature_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('generic_tuya_measure_humidity_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('generic_tuya_dp_received'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('generic_tuya_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('generic_tuya_temp_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('generic_tuya_humidity_changed'); } catch (e) {}

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('generic_tuya_battery_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
        });
      }
    } catch (err) { this.error(`Condition generic_tuya_battery_above: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('generic_tuya_request_dp');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action generic_tuya_request_dp triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action generic_tuya_request_dp: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = GenericTuyaDriver;
