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
      const card = this._getFlowCard('smart_knob_rotary_brightness_above', 'condition');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition smart_knob_rotary_brightness_above: ${err.message}`); }; }

    // ACTIONS
    try {
      const card = this._getFlowCard('smart_knob_rotary_set_brightness', 'action');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device['setCapabilityValue']('dim', args.brightness || args.value || 1).catch(() => {});
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action smart_knob_rotary_set_brightness: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = SmartKnobRotaryDriver;
