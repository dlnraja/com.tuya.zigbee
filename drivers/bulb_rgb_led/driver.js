'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartBulbRgbDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('SmartBulbRgbDriver initialized');
    this._registerFlowCards();
  }

  async _registerFlowCards() {
    // CONDITION: Is on/off
    try {
      const conditionCard = this.homey.flow.getConditionCard('bulb_rgb_smart_bulb_rgb_is_on');
      if (conditionCard) {
        conditionCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_rgb_smart_bulb_rgb_is_on error: ${err.message}`);
    }

    // ACTION: Turn on
    try {
      const turnOnCard = this.homey.flow.getActionCard('bulb_rgb_smart_bulb_rgb_turn_on');
      if (turnOnCard) {
        turnOnCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_rgb_smart_bulb_rgb_turn_on error: ${err.message}`);
    }

    // ACTION: Turn off
    try {
      const turnOffCard = this.homey.flow.getActionCard('bulb_rgb_smart_bulb_rgb_turn_off');
      if (turnOffCard) {
        turnOffCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_rgb_smart_bulb_rgb_turn_off error: ${err.message}`);
    }

    // ACTION: Toggle
    try {
      const toggleCard = this.homey.flow.getActionCard('bulb_rgb_smart_bulb_rgb_toggle');
      if (toggleCard) {
        toggleCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] bulb_rgb_smart_bulb_rgb_toggle error: ${err.message}`);
    }
  }
}

module.exports = SmartBulbRgbDriver;
