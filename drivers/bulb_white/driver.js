'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.577: CRITICAL FIX - Flow card run listeners were missing
 */
class SmartBulbWhiteDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartBulbWhiteDriver v5.5.577 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const P = 'bulb_white_smart_bulb_white';
    
    // CONDITION: Is on
    try {
      const isOnCard = this.homey.flow.getConditionCard(`${P}_is_on`);
      if (isOnCard) {
        isOnCard.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) {
      this.error(`Condition card ${P}_is_on registration error: ${err.message}`);
    }

    const actions = [
      {
        id: `${P}_turn_on`,
        fn: async (args) => {
          await args.device._setGangOnOff(1, true).catch(() => { });
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        }
      },
      {
        id: `${P}_turn_off`,
        fn: async (args) => {
          await args.device._setGangOnOff(1, false).catch(() => { });
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        }
      },
      {
        id: `${P}_toggle`,
        fn: async (args) => {
          const current = args.device.getCapabilityValue('onoff');
          await args.device._setGangOnOff(1, !current).catch(() => { });
          await args.device.setCapabilityValue('onoff', !current).catch(() => {});
          return true;
        }
      },
      {
        id: `${P}_set_dim`,
        fn: async (args) => {
          await args.device['setCapabilityValue']('dim', args.brightness);
          return true;
        }
      }
    ];

    for (const { id, fn } of actions) {
      try {
        const card = this.homey.flow.getActionCard(id);
        if (card) {
          card.registerRunListener(async (args) => {
            if (!args.device) return false;
            return fn(args);
          });
        }
      } catch (err) {
        this.error(`Action card ${id} registration error: ${err.message}`);
      }
    }

    this.log('[FLOW] White bulb flow cards registered');
  }
}

module.exports = SmartBulbWhiteDriver;
