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
    const triggers = [
      'wall_switch_2gang_1way_turned_on',
      'wall_switch_2gang_1way_turned_off',
      'wall_switch_2gang_1way_gang1_scene',
      'wall_switch_2gang_1way_gang2_scene'
    ];
    for (const id of triggers) {
      try {
        this.homey.flow.getDeviceTriggerCard(id);
        this.log(`✅ Trigger: ${id}`);
      } catch (err) {
        this.error(`Failed trigger ${id}: ${err.message}`);
      }
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
      this.log('✅ Action: set_backlight');
    } catch (err) {
      this.error('Action set_backlight failed:', err.message);
    }

    // ACTION: Set scene mode
    try {
      this.homey.flow.getActionCard('wall_switch_2gang_1way_set_scene_mode')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          this.log(`Flow: Setting scene mode to ${args.mode}`);
          await args.device.setSceneMode(args.mode);
          await args.device.setSettings({ scene_mode: args.mode }).catch(() => {});
          return true;
        });
      this.log('✅ Action: set_scene_mode');
    } catch (err) {
      this.error('Action set_scene_mode failed:', err.message);
    }
  }

}

module.exports = WallSwitch2Gang1WayDriver;
