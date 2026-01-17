'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class TuyaZigbeeDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Tuya Zigbee 3-Gang Switch Driver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITIONS
    ['gang1', 'gang2', 'gang3'].forEach((gang, idx) => {
      try {
        this.homey.flow.getConditionCard(`switch_3gang_${gang}_is_on`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.${idx + 1}`;
            return args.device.getCapabilityValue(cap) === true;
          });
        this.log(`[FLOW] ✅ switch_3gang_${gang}_is_on`);
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }
    });

    // ACTIONS
    ['gang1', 'gang2', 'gang3'].forEach((gang, idx) => {
      try {
        this.homey.flow.getActionCard(`switch_3gang_turn_on_${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.${idx + 1}`;
            await args.device.setCapabilityValue(cap, true);
            return true;
          });
        this.log(`[FLOW] ✅ switch_3gang_turn_on_${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

      try {
        this.homey.flow.getActionCard(`switch_3gang_turn_off_${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            const cap = idx === 0 ? 'onoff' : `onoff.${idx + 1}`;
            await args.device.setCapabilityValue(cap, false);
            return true;
          });
        this.log(`[FLOW] ✅ switch_3gang_turn_off_${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }
    });

    this.log('[FLOW] 🎉 3-Gang switch flow cards registered');
  }
}

module.exports = TuyaZigbeeDriver;
