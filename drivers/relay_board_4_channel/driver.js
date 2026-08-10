'use strict';

const { Driver } = require('homey');

/**
 * P98: use triggerCapabilityListener so OnOff ZCL write actually fires
 * (setCapabilityValue alone only updates Homey state).
 */
class RelayBoard4ChannelDriver extends Driver {
  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;

    const setOnOff = async (device, value) => {
      if (!device) return false;
      if (typeof device.triggerCapabilityListener === 'function') {
        await device.triggerCapabilityListener('onoff', value).catch(() => {});
      } else {
        await device.setCapabilityValue('onoff', value).catch(() => {});
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
      if (!args.device) return false;
      const v = args.device.getCapabilityValue('onoff');
      return setOnOff(args.device, !v);
    });

    this.homey.flow.getConditionCard('relay_board_4_channel_is_on')?.registerRunListener(async (args) => {
      if (!args.device) return false;
      return !!args.device.getCapabilityValue('onoff');
    });
  }
}

module.exports = RelayBoard4ChannelDriver;
