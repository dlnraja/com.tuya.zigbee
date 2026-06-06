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
    // TRIGGERS
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('smart_knob_rotary_brightness_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition smart_knob_rotary_brightness_above: ${err.message}`); }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('smart_knob_rotary_set_brightness');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device.triggerCapabilityListener('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { this.error(`Action smart_knob_rotary_set_brightness: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = SmartKnobRotaryDriver;
