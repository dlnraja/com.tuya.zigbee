'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch3Gang1WayDriver extends ZigBeeDriver {
  async onInit() {
    this.log('Wall Switch 3-Gang 1-Way Driver initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    const triggers = [
      'wall_switch_3gang_1way_turned_on',
      'wall_switch_3gang_1way_turned_off',
      'wall_switch_3gang_1way_gang1_scene',
      'wall_switch_3gang_1way_gang2_scene',
      'wall_switch_3gang_1way_gang3_scene'
    ];
    for (const id of triggers) {
      try { this.homey.flow.getDeviceTriggerCard(id); } catch (e) { this.error(`Trigger ${id}: ${e.message}`); }
    }

    try {
      this.homey.flow.getActionCard('wall_switch_3gang_1way_set_backlight')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setBacklightMode(args.mode);
          await args.device.setSettings({ backlight_mode: args.mode }).catch(() => {});
          return true;
        });
    } catch (err) { this.error('Action set_backlight failed:', err.message); }

    try {
      this.homey.flow.getActionCard('wall_switch_3gang_1way_set_scene_mode')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSceneMode(args.mode);
          await args.device.setSettings({ scene_mode: args.mode }).catch(() => {});
          return true;
        });
    } catch (err) { this.error('Action set_scene_mode failed:', err.message); }
  }
}

module.exports = WallSwitch3Gang1WayDriver;
