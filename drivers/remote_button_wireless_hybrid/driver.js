'use strict';

const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');
const Homey = require('homey');

class RemoteButtonWirelessHybridDriver extends Homey {
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
    this.log('Remote Button Wireless Hybrid driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_rotate_left'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_rotate_right'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_pressed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_single_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_double_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('remote_button_wireless_hybrid_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('remote_button_wireless_hybrid_brightness_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition remote_button_wireless_hybrid_brightness_above: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('remote_button_wireless_hybrid_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action remote_button_wireless_hybrid_set_brightness: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = RemoteButtonWirelessHybridDriver;
