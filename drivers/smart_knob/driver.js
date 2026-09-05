'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * P2364 — Smart Knob (TS004F) flow registration parity with button_wireless_1.
 */
class SmartKnobDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    this.log('SmartKnobDriver P2364 initialized');
    registerButtonFlowCards(this, 'smart_knob', 1);
    for (const triggerId of [
      'smart_knob_battery_low',
      'smart_knob_button_1gang_button_scene_recall',
    ]) {
      try {
        const card = this.homey.flow.getDeviceTriggerCard(triggerId);
        if (card?.registerRunListener) {
          card.registerRunListener(async (args) => !!args.device);
          this.log(`[FLOW] Registered: ${triggerId}`);
        }
      } catch (_e) { /* optional */ }
    }
  }
}

module.exports = SmartKnobDriver;
