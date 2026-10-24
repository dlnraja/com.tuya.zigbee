'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * P2839 — DIN rail driver. Prior copy-paste registered hollow doorbell_* cards
 * that were never in driver.flow.compose.json (creux). Wire only compose IDs.
 */
class DeviceDinRailDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('DeviceDinRailDriver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      const card = this.homey.flow.getConditionCard('device_din_rail_is_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) {
      this.log(`[FLOW] condition is_on: ${err.message}`);
    }

    const setOnOff = async (device, value) => {
      if (typeof device.safeSetCapabilityValue === 'function') {
        await device.safeSetCapabilityValue('onoff', value).catch(() => {});
      } else {
        await device.setCapabilityValue('onoff', value).catch(() => {});
      }
      return true;
    };

    try {
      const card = this.homey.flow.getActionCard('device_din_rail_turn_on');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return setOnOff(args.device, true);
        });
      }
    } catch (err) {
      this.log(`[FLOW] action turn_on: ${err.message}`);
    }

    try {
      const card = this.homey.flow.getActionCard('device_din_rail_turn_off');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return setOnOff(args.device, false);
        });
      }
    } catch (err) {
      this.log(`[FLOW] action turn_off: ${err.message}`);
    }

    try {
      const card = this.homey.flow.getActionCard('device_din_rail_toggle');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const current = args.device.getCapabilityValue('onoff');
          return setOnOff(args.device, !current);
        });
      }
    } catch (err) {
      this.log(`[FLOW] action toggle: ${err.message}`);
    }

    this.log('[FLOW] DIN rail flow cards registered (compose-aligned)');
  }
}

module.exports = DeviceDinRailDriver;
