'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ButtonWirelessDriver extends ZigBeeDriver {
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
    this.log('ButtonWirelessDriver v5.5.585 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('button_wireless_button_pressed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_button_double_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_button_long_press'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_button_release'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('button_wireless_battery_low'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('button_wireless_battery_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
      });
      }
    } catch (err) { this.error(`Condition button_wireless_battery_above: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = ButtonWirelessDriver;
