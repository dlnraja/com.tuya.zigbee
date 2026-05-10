'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.576: CRITICAL FIX - Flow card run listeners were missing
 */
class HvacDehumidifierDriver extends ZigBeeDriver {

  async onInit() {
    this.log('HvacDehumidifierDriver v5.5.576 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Is on
    try {
      (() => { try { return this.homey.flow.getConditionCard('hvac_dehumidifier_dehumidifier_is_on'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      this.log('[FLOW] ✅ hvac_dehumidifier_dehumidifier_is_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn on
    try {
      (() => { try { return this.homey.flow.getActionCard('hvac_dehumidifier_dehumidifier_turn_on'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, true).catch(() => {});
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ hvac_dehumidifier_dehumidifier_turn_on');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Turn off
    try {
      (() => { try { return this.homey.flow.getActionCard('hvac_dehumidifier_dehumidifier_turn_off'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device._setGangOnOff(1, false).catch(() => {});
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ hvac_dehumidifier_dehumidifier_turn_off');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // ACTION: Toggle
    try {
      (() => { try { return this.homey.flow.getActionCard('hvac_dehumidifier_dehumidifier_toggle'); } catch(e) { return null; } })()?.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => {});
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        });
      this.log('[FLOW] ✅ hvac_dehumidifier_dehumidifier_toggle');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW]  HVAC dehumidifier flow cards registered');
  }
}

module.exports = HvacDehumidifierDriver;
