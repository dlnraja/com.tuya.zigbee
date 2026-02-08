'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Wall Switch 2-Gang 1-Way Driver (BSEED Sub-Device)
 * v5.8.73: PacketNinja sub-device architecture — each gang = separate Homey device card
 * Sub-device support configured via driver.compose.json "devices" section
 */
class WallSwitch2Gang1WayDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Wall Switch 2-Gang 1-Way Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // Physical button triggers
    try {
      this.homey.flow.getDeviceTriggerCard('wall_switch_2gang_1way_turned_on');
      this.homey.flow.getDeviceTriggerCard('wall_switch_2gang_1way_turned_off');
    } catch (err) {
      this.error('Failed to register trigger cards:', err.message);
    }

    // ACTION: Set backlight mode
    try {
      this.homey.flow.getActionCard('wall_switch_2gang_1way_set_backlight')
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

module.exports = WallSwitch2Gang1WayDriver;
