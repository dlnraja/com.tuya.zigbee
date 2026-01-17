'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.574: CRITICAL FIX - Flow card run listeners were missing
 */
class LedStripDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LedStripDriver v5.5.574 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is on/off
    try {
      this.homey.flow.getConditionCard('led_strip_led_strip_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ led_strip_led_strip_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getActionCard('led_strip_led_strip_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ led_strip_led_strip_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getActionCard('led_strip_led_strip_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ led_strip_led_strip_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getActionCard('led_strip_led_strip_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
          return true;
        });
      this.log('[FLOW] ✅ led_strip_led_strip_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 LED strip flow cards registered');
  }
}

module.exports = LedStripDriver;
