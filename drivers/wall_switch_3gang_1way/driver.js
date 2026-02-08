'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch3Gang1WayDriver extends ZigBeeDriver {
  async onInit() {
    this.log('Wall Switch 3-Gang 1-Way Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    try {
      this.homey.flow.getDeviceTriggerCard('wall_switch_3gang_1way_turned_on');
      this.homey.flow.getDeviceTriggerCard('wall_switch_3gang_1way_turned_off');
    } catch (err) {
      this.error('Failed to register trigger cards:', err.message);
    }

    try {
      this.homey.flow.getActionCard('wall_switch_3gang_1way_set_backlight')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setBacklightMode(args.mode);
          await args.device.setSettings({ backlight_mode: args.mode }).catch(() => {});
          return true;
        });
    } catch (err) {
      this.error('Flow card registration failed:', err.message);
    }
  }
}

module.exports = WallSwitch3Gang1WayDriver;
