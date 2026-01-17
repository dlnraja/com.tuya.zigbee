'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.571: CRITICAL FIX - Flow card run listeners were missing
 */
class SmartBulbDimmerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartBulbDimmerDriver v5.5.571 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is on/off
    try {
      this.homey.flow.getConditionCard('bulb_dimmable_smart_bulb_dimmer_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ bulb_dimmable_smart_bulb_dimmer_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getActionCard('bulb_dimmable_smart_bulb_dimmer_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ bulb_dimmable_smart_bulb_dimmer_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getActionCard('bulb_dimmable_smart_bulb_dimmer_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ bulb_dimmable_smart_bulb_dimmer_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getActionCard('bulb_dimmable_smart_bulb_dimmer_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
          return true;
        });
      this.log('[FLOW] ✅ bulb_dimmable_smart_bulb_dimmer_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Set brightness
    try {
      this.homey.flow.getActionCard('bulb_dimmable_smart_bulb_dimmer_set_dim')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('dim', args.brightness);
          return true;
        });
      this.log('[FLOW] ✅ bulb_dimmable_smart_bulb_dimmer_set_dim');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Dimmable bulb flow cards registered');
  }
}

module.exports = SmartBulbDimmerDriver;
