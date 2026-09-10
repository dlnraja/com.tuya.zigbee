'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * P2364 / P2449 — Smart Knob flows: press parity + rotate / brightness UX.
 */
class SmartKnobDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    this.log('SmartKnobDriver P2449 initialized');
    registerButtonFlowCards(this, 'smart_knob', 1);
    for (const triggerId of [
      'smart_knob_battery_low',
      'smart_knob_button_1gang_button_scene_recall',
      'smart_knob_rotate_left',
      'smart_knob_rotate_right',
      'smart_knob_press_and_rotate_left',
      'smart_knob_press_and_rotate_right',
      'smart_knob_brightness_changed',
    ]) {
      try {
        const card = this.homey.flow.getDeviceTriggerCard(triggerId);
        if (card?.registerRunListener) {
          card.registerRunListener(async (args) => !!args.device);
          this.log(`[FLOW] Registered: ${triggerId}`);
        }
      } catch (_e) { /* optional */ }
    }

    try {
      const cond = this.homey.flow.getConditionCard('smart_knob_brightness_above');
      if (cond) {
        cond.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = typeof args.device.getKnobBrightnessPercent === 'function'
            ? args.device.getKnobBrightnessPercent()
            : Number(args.device.getCapabilityValue('dim') ?? 0) * 100;
          return current > Number(args.level ?? 0);
        });
      }
    } catch (_e) { /* optional */ }

    try {
      const act = this.homey.flow.getActionCard('smart_knob_set_brightness');
      if (act) {
        act.registerRunListener(async (args) => {
          if (!args.device) return false;
          const brightness = Number(args.brightness ?? 100);
          if (typeof args.device.setKnobBrightnessPercent === 'function') {
            return args.device.setKnobBrightnessPercent(brightness);
          }
          const dim = Math.max(0, Math.min(1, brightness > 1 ? brightness / 100 : brightness));
          await args.device.setCapabilityValue('dim', dim).catch(() => {});
          return true;
        });
      }
    } catch (_e) { /* optional */ }
  }
}

module.exports = SmartKnobDriver;
