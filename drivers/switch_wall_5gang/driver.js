'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.587: Added flow card run listeners for all conditions and actions
 */
class WallSwitch5gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WallSwitch5gangDriver v5.5.587 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const gangs = [1, 2, 3, 4, 5];
    const capMap = { 1: 'onoff', 2: 'onoff.gang2', 3: 'onoff.gang3', 4: 'onoff.gang4', 5: 'onoff.gang5' };

    // Register conditions for each gang
    gangs.forEach(gang => {
      try {
        this.homey.flow.getConditionCard(`switch_wall_5gang_gang${gang}_is_on`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            return args.device.getCapabilityValue(capMap[gang]) === true;
          });
        this.log(`[FLOW] ✅ switch_wall_5gang_gang${gang}_is_on`);
      } catch (err) { this.log(`[FLOW] ⚠️ gang${gang}_is_on: ${err.message}`); }
    });

    // Register actions for each gang
    gangs.forEach(gang => {
      try {
        this.homey.flow.getActionCard(`switch_wall_5gang_turn_on_gang${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            await args.device.setCapabilityValue(capMap[gang], true);
            return true;
          });
        this.log(`[FLOW] ✅ switch_wall_5gang_turn_on_gang${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ turn_on_gang${gang}: ${err.message}`); }

      try {
        this.homey.flow.getActionCard(`switch_wall_5gang_turn_off_gang${gang}`)
          .registerRunListener(async (args) => {
            if (!args.device) return false;
            await args.device.setCapabilityValue(capMap[gang], false);
            return true;
          });
        this.log(`[FLOW] ✅ switch_wall_5gang_turn_off_gang${gang}`);
      } catch (err) { this.log(`[FLOW] ⚠️ turn_off_gang${gang}: ${err.message}`); }
    });

    this.log('[FLOW] 🎉 All 5-gang switch flow cards registered');
  }
}

module.exports = WallSwitch5gangDriver;
