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
    try { this.homey.flow.getTriggerCard('device_generic_tuya_universal_hybrid_generic_tuya_measure_temperature_changed_device_generic_tuya_universal_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_generic_tuya_universal_hybrid_generic_tuya_measure_humidity_changed_device_generic_tuya_universal_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_generic_tuya_universal_hybrid_generic_tuya_dp_received_device_generic_tuya_universal_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_generic_tuya_universal_hybrid_generic_tuya_battery_low_device_generic_tuya_universal_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_generic_tuya_universal_hybrid_generic_tuya_temp_changed_device_generic_tuya_universal_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_generic_tuya_universal_hybrid_generic_tuya_humidity_changed_device_generic_tuya_universal_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('device_generic_tuya_universal_hybrid_generic_tuya_X_changed'); } catch (e) {}

    // CONDITIONS
    try {
      // A8: NaN Safety - use safeDivide/safeMultiply
  const card = this.homey.flow.getConditionCard('device_generic_tuya_universal_hybrid_generic_tuya_battery_above_device_generic_tuya_universal_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
      });
      }
    } catch (err) { this.error(`Condition device_generic_tuya_universal_hybrid_generic_tuya_battery_above_device_generic_tuya_universal_hybrid: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('device_generic_tuya_universal_hybrid_generic_tuya_request_dp_device_generic_tuya_universal_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action device_generic_tuya_universal_hybrid_generic_tuya_request_dp_device_generic_tuya_universal_hybrid triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action device_generic_tuya_universal_hybrid_generic_tuya_request_dp_device_generic_tuya_universal_hybrid: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = GenericTuyaDriver;
