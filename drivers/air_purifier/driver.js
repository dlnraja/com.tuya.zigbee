'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class AirPurifierDriver extends ZigBeeDriver {
  async onInit() {
    this.log('Air Purifier Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const triggers = ['air_purifier_turned_on', 'air_purifier_turned_off', 'air_purifier_pm25_changed'];
    for (const id of triggers) {
      try {
        this.homey.flow.getTriggerCard(id);
      } catch (e) {
        this.error(`Trigger ${id} registration error: ${e.message}`);
      }
    }

    const actions = [
      {
        id: 'air_purifier_set_fan_speed',
        fn: async (args) => {
          await args.device['setCapabilityValue']('dim', args.speed / 100);
          return true;
        }
      },
      {
        id: 'air_purifier_turn_on',
        fn: async (args) => {
          await args.device._setGangOnOff(1, true).catch(() => { });
          await args.device.setCapabilityValue('onoff', true).catch(() => {});
          return true;
        }
      },
      {
        id: 'air_purifier_turn_off',
        fn: async (args) => {
          await args.device._setGangOnOff(1, false).catch(() => { });
          await args.device.setCapabilityValue('onoff', false).catch(() => {});
          return true;
        }
      },
      {
        id: 'air_purifier_toggle',
        fn: async (args) => {
          await args.device['setCapabilityValue']('onoff', !args.device.getCapabilityValue('onoff'));
          return true;
        }
      },
      {
        id: 'air_purifier_set_brightness',
        fn: async (args) => {
          await args.device['setCapabilityValue']('dim', args.brightness / 100);
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
      } catch (e) {
        this.error(`Action ${id} registration error: ${e.message}`);
      }
    }
  }
}

module.exports = AirPurifierDriver;
