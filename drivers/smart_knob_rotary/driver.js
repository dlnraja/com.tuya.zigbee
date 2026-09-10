'use strict';

const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');
const BaseZigBeeDriver = require('../../lib/drivers/BaseZigBeeDriver');

class SmartKnobRotaryDriver extends BaseZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('Smart Knob Rotary driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS — SDK3 device triggers need registerRunListener for filter args
    for (const triggerId of [
      'smart_knob_rotary_rotate_left',
      'smart_knob_rotary_rotate_right',
      'smart_knob_rotary_pressed',
      'smart_knob_rotary_single_press',
      'smart_knob_rotary_double_press',
      'smart_knob_rotary_long_press',
      'smart_knob_rotary_battery_low',
      'smart_knob_rotary_press_and_rotate_left',
      'smart_knob_rotary_press_and_rotate_right',
      'smart_knob_rotary_scene_recall',
      'smart_knob_rotary_brightness_changed',
    ]) {
      try {
        const card = this.homey.flow.getDeviceTriggerCard(triggerId);
        if (card?.registerRunListener) {
          card.registerRunListener(async (args) => !!args.device);
        }
      } catch (_e) { /* optional */ }
    }

    // CONDITIONS
    try {
      const card = this._getFlowCard('smart_knob_rotary_brightness_above', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const currentDim = typeof args.device.getKnobBrightnessPercent === 'function'
            ? args.device.getKnobBrightnessPercent()
            : Number(args.device.getCapabilityValue('dim') ?? 0) * 100;
          const level = Number(args.level ?? args.threshold ?? 0);
          return currentDim > level;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition smart_knob_rotary_brightness_above: ${err.message}`); } }

    // ACTIONS
    try {
      const card = this._getFlowCard('smart_knob_rotary_set_brightness', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const brightness = Number(args.brightness ?? args.value ?? 100);
          // WHY(P2449): keep simulated brightness + brightness_changed in sync
          if (typeof args.device.setKnobBrightnessPercent === 'function') {
            return args.device.setKnobBrightnessPercent(brightness);
          }
          const dim = Math.max(0, Math.min(1, brightness > 1 ? brightness / 100 : brightness));
          if (typeof args.device.safeSetCapabilityValue === 'function') {
            await args.device.safeSetCapabilityValue('dim', dim).catch(() => {});
          } else {
            await args.device.setCapabilityValue('dim', dim).catch(() => {});
          }
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action smart_knob_rotary_set_brightness: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = SmartKnobRotaryDriver;
