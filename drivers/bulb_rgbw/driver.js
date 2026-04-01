'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.574: CRITICAL FIX - Flow card run listeners were missing
 */
class BulbRgbwDriver extends ZigBeeDriver {

  async onInit() {
    this.log('BulbRgbwDriver v5.5.574 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is on/off
    try {
      this.homey.flow.getConditionCard('bulb_rgbw_bulb_rgbw_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ bulb_rgbw_bulb_rgbw_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getActionCard('bulb_rgbw_bulb_rgbw_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ bulb_rgbw_bulb_rgbw_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getActionCard('bulb_rgbw_bulb_rgbw_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.triggerCapabilityListener('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ bulb_rgbw_bulb_rgbw_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getActionCard('bulb_rgbw_bulb_rgbw_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.triggerCapabilityListener('onoff', !current);
          return true;
        });
      this.log('[FLOW] ✅ bulb_rgbw_bulb_rgbw_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  RGBW bulb flow cards registered');
  }
}

module.exports = BulbRgbwDriver;
