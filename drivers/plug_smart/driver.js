'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class PlugSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PlugSmartDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Plug is/is not on
    try {
      this.homey.flow.getConditionCard('plug_smart_is_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ plug_smart_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      this.homey.flow.getActionCard('plug_smart_turn_on')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true);
          return true;
        });
      this.log('[FLOW] ✅ plug_smart_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      this.homey.flow.getActionCard('plug_smart_turn_off')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false);
          return true;
        });
      this.log('[FLOW] ✅ plug_smart_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      this.homey.flow.getActionCard('plug_smart_toggle')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
          return true;
        });
      this.log('[FLOW] ✅ plug_smart_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on after delay
    try {
      this.homey.flow.getActionCard('plug_smart_turn_on_delay')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const delay = (args.delay || 10) * 1000;
          setTimeout(() => args.device.setCapabilityValue('onoff', true).catch(() => {}), delay);
          return true;
        });
      this.log('[FLOW] ✅ plug_smart_turn_on_delay');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off after delay
    try {
      this.homey.flow.getActionCard('plug_smart_turn_off_delay')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const delay = (args.delay || 10) * 1000;
          setTimeout(() => args.device.setCapabilityValue('onoff', false).catch(() => {}), delay);
          return true;
        });
      this.log('[FLOW] ✅ plug_smart_turn_off_delay');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Smart plug flow cards registered');
  }
}

module.exports = PlugSmartDriver;
