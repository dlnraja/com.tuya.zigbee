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

  async _registerFlowCards() {
    // CONDITION: Is on/off
    try {
      const conditionCard = this.homey.flow.getConditionCard('bulb_rgbw_bulb_rgbw_is_on');
      if (conditionCard) {
        conditionCard.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_rgbw_bulb_rgbw_is_on error: ${err.message}`);
    }

    // ACTION: Turn on
    try {
      const turnOnCard = this.homey.flow.getActionCard('bulb_rgbw_bulb_rgbw_turn_on');
      if (turnOnCard) {
        turnOnCard.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device._setGangOnOff(1, true).catch(() => { });
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_rgbw_bulb_rgbw_turn_on error: ${err.message}`);
    }

    // ACTION: Turn off
    try {
      const turnOffCard = this.homey.flow.getActionCard('bulb_rgbw_bulb_rgbw_turn_off');
      if (turnOffCard) {
        turnOffCard.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          await args.device._setGangOnOff(1, false).catch(() => { });
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_rgbw_bulb_rgbw_turn_off error: ${err.message}`);
    }

    // ACTION: Toggle
    try {
      const toggleCard = this.homey.flow.getActionCard('bulb_rgbw_bulb_rgbw_toggle');
      if (toggleCard) {
        toggleCard.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => { });
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_rgbw_bulb_rgbw_toggle error: ${err.message}`);
    }

    this.log('[FLOW] RGBW bulb flow cards registered');
  }
}

module.exports = BulbRgbwDriver;
