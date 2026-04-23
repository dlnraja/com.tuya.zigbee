'use strict';

const { safeMultiply } = require('../../lib/utils/tuyaUtils.js');
const Homey = require('homey');

class SmartKnobRotaryDriver extends Homey {
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
    this.log('Smart Knob Rotary driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('smart_knob_rotary_hybrid_smart_knob_rotary_rotate_left_smart_knob_rotary_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('smart_knob_rotary_hybrid_smart_knob_rotary_rotate_right_smart_knob_rotary_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('smart_knob_rotary_hybrid_smart_knob_rotary_pressed_smart_knob_rotary_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('smart_knob_rotary_hybrid_smart_knob_rotary_single_press_smart_knob_rotary_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('smart_knob_rotary_hybrid_smart_knob_rotary_double_press_smart_knob_rotary_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('smart_knob_rotary_hybrid_smart_knob_rotary_long_press_smart_knob_rotary_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('smart_knob_rotary_hybrid_smart_knob_rotary_battery_low_smart_knob_rotary_hybrid'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('smart_knob_rotary_hybrid_rotate_left'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('smart_knob_rotary_hybrid_rotate_right'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('smart_knob_rotary_hybrid_pressed'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('smart_knob_rotary_hybrid_smart_knob_rotary_brightness_above_smart_knob_rotary_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition smart_knob_rotary_hybrid_smart_knob_rotary_brightness_above_smart_knob_rotary_hybrid: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('smart_knob_rotary_hybrid_smart_knob_rotary_set_brightness_smart_knob_rotary_hybrid');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action smart_knob_rotary_hybrid_smart_knob_rotary_set_brightness_smart_knob_rotary_hybrid: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = SmartKnobRotaryDriver;
