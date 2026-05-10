'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RemoteButtonWirelessDriver extends ZigBeeDriver {
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
    this.log('Remote Button Wireless driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const triggerCards = [
      'remote_button_wireless_rotate_left',
      'remote_button_wireless_rotate_right',
      'remote_button_wireless_pressed',
      'remote_button_wireless_single_press',
      'remote_button_wireless_double_press',
      'remote_button_wireless_long_press',
      'remote_button_wireless_battery_low'
    ];
    for (const id of triggerCards) {
      try {
        const card = this.homey.flow.getTriggerCard(id);
        if (card) this.log(`[FLOW] Trigger registered: ${id}`);
      } catch (err) { this.error(`Trigger ${id}: ${err.message}`); }
    }

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('remote_button_wireless_brightness_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_luminance') || 0;
          return val > (args.threshold || 100);
        });
      }
    } catch (err) { this.error(`Condition brightness_above: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('remote_button_wireless_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action set_brightness: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = RemoteButtonWirelessDriver;

