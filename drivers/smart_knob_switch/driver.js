'use strict';

const { Driver } = require('homey');
const { registerButtonFlowCards } = require('../../lib/FlowCardHelper');

/**
 * P2449 — Smart Knob Switch: press + rotate/brightness flow UX.
 */
class SmartKnobSwitchDriver extends Driver {
  async onInit() {
    if (this._flowCardsRegistered) { return; }
    this._flowCardsRegistered = true;
    this.log('smart_knob_switch driver init (P2449)');
    registerButtonFlowCards(this, 'smart_knob_switch', 1);

    for (const triggerId of [
      'smart_knob_switch_rotate_left',
      'smart_knob_switch_rotate_right',
      'smart_knob_switch_press_and_rotate_left',
      'smart_knob_switch_press_and_rotate_right',
      'smart_knob_switch_brightness_changed',
      'smart_knob_switch_battery_low',
      'smart_knob_switch_scene_recall',
    ]) {
      try {
        const card = this.homey.flow.getDeviceTriggerCard(triggerId);
        if (card?.registerRunListener) {
          card.registerRunListener(async (args) => !!args.device);
        }
      } catch (_e) { /* optional */ }
    }

    try {
      const cond = this.homey.flow.getConditionCard('smart_knob_switch_brightness_above');
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
      const act = this.homey.flow.getActionCard('smart_knob_switch_set_brightness');
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

module.exports = SmartKnobSwitchDriver;
