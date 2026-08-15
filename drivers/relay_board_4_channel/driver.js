'use strict';

const { Driver } = require('homey');

/**
 * Flow cards for 4-channel relay — gang actions via _setGangOnOff / capabilities.
 */
class RelayBoard4ChannelDriver extends Driver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;

    const setOnOff = async (device, value) => {
      if (!device) {return false;}
      if (typeof device.triggerCapabilityListener === 'function') {
        await device.triggerCapabilityListener('onoff', value).catch(() => {});
      } else {
        await device.setCapabilityValue('onoff', value).catch(() => {});
      }
      return true;
    };

    const setGang = async (device, gang, value) => {
      if (!device) {return false;}
      if (typeof device._setGangOnOff === 'function') {
        await device._setGangOnOff(gang, value);
        return true;
      }
      const cap = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
      if (typeof device.triggerCapabilityListener === 'function') {
        await device.triggerCapabilityListener(cap, value).catch(() => {});
      } else {
        await device.setCapabilityValue(cap, value).catch(() => {});
      }
      return true;
    };

    this.homey.flow.getActionCard('relay_board_4_channel_turn_on')?.registerRunListener(async (args) => {
      return setOnOff(args.device, true);
    });
    this.homey.flow.getActionCard('relay_board_4_channel_turn_off')?.registerRunListener(async (args) => {
      return setOnOff(args.device, false);
    });
    this.homey.flow.getActionCard('relay_board_4_channel_toggle')?.registerRunListener(async (args) => {
      if (!args.device) {return false;}
      const v = args.device.getCapabilityValue('onoff');
      return setOnOff(args.device, !v);
    });
    this.homey.flow.getConditionCard('relay_board_4_channel_is_on')?.registerRunListener(async (args) => {
      if (!args.device) {return false;}
      return !!args.device.getCapabilityValue('onoff');
    });

    for (const gang of [1, 2, 3, 4]) {
      this.homey.flow.getActionCard(`relay_board_4_channel_turn_on_gang${gang}`)
        ?.registerRunListener(async (args) => setGang(args.device, gang, true));
      this.homey.flow.getActionCard(`relay_board_4_channel_turn_off_gang${gang}`)
        ?.registerRunListener(async (args) => setGang(args.device, gang, false));
      this.homey.flow.getConditionCard(`relay_board_4_channel_gang${gang}_is_on`)
        ?.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const cap = gang === 1 ? 'onoff' : `onoff.gang${gang}`;
          return !!args.device.getCapabilityValue(cap);
        });
    }
  }
}

module.exports = RelayBoard4ChannelDriver;
