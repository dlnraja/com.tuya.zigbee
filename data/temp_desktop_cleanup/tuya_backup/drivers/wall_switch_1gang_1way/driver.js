'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * Wall Switch 1-Gang 1-Way Driver
 */
class WallSwitch1Gang1WayDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Wall Switch 1-Gang 1-Way Driver initialized');
    this._registerFlowCards();
  }

  /**
   * Register flow cards for physical button triggers
   */
  _registerFlowCards() {
    this.log('Registering flow cards...');

    try {
      // Flow card: Turned on (physical button)
      this.homey.flow.getDeviceTriggerCard('wall_switch_1gang_1way_turned_on');
      this.log('✅ Flow card registered: wall_switch_1gang_1way_turned_on');
    } catch (err) {
      this.error('Failed to register turned_on flow card:', err.message);
    }

    try {
      // Flow card: Turned off (physical button)
      this.homey.flow.getDeviceTriggerCard('wall_switch_1gang_1way_turned_off');
      this.log('✅ Flow card registered: wall_switch_1gang_1way_turned_off');
    } catch (err) {
      this.error('Failed to register turned_off flow card:', err.message);
    }

    try {
      this.homey.flow.getDeviceTriggerCard('wall_switch_1gang_1way_gang1_scene');
      this.log('✅ Flow card registered: wall_switch_1gang_1way_gang1_scene');
    } catch (err) { this.error('Scene trigger failed:', err.message); }

    try {
      this.homey.flow.getActionCard('wall_switch_1gang_1way_set_scene_mode')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSceneMode(args.mode);
          return true;
        });
      this.log('✅ Flow card registered: wall_switch_1gang_1way_set_scene_mode');
    } catch (err) { this.error('Scene mode action failed:', err.message); }

    // ACTION: Set backlight mode
    try {
      this.homey.flow.getActionCard('wall_switch_1gang_1way_set_backlight')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          this.log(`Flow: Setting backlight mode to ${args.mode}`);

          // Use HybridSwitchBase's setBacklightMode method
          await args.device.setBacklightMode(args.mode);

          // Update the setting in Homey
          await args.device.setSettings({ backlight_mode: args.mode }).catch(() => {});

          return true;
        });
      this.log('✅ Flow card registered: wall_switch_1gang_1way_set_backlight');
    } catch (err) {
      this.log(`⚠️ Flow card registration failed: ${err.message}`);
    }

    // ACTION: Set power-on behavior (v5.11.30)
    try {
      this.homey.flow.getActionCard('wall_switch_1gang_1way_set_power_on_behavior')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSettings({ power_on_behavior: args.mode });
          const pobValue = { off: 0, on: 1, memory: 2 }[args.mode] ?? 2;
          if (typeof args.device._writeE001Attribute === 'function') {
            await args.device._writeE001Attribute('powerOnBehavior', pobValue);
          } else if (typeof args.device._sendTuyaDP === 'function') {
            await args.device._sendTuyaDP(14, pobValue, 'enum');
          }
          return true;
        });
    } catch (err) { this.log('set_power_on_behavior card:', err.message); }

    // ACTION: Set external switch type (v5.11.30)
    try {
      this.homey.flow.getActionCard('wall_switch_1gang_1way_set_switch_mode')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          await args.device.setSettings({ switch_mode: args.mode });
          const smValue = { toggle: 0, state: 1, momentary: 2 }[args.mode] ?? 0;
          if (typeof args.device._writeE001Attribute === 'function') {
            await args.device._writeE001Attribute('switchMode', smValue);
          }
          return true;
        });
    } catch (err) { this.log('set_switch_mode card:', err.message); }

    this.log('Flow cards registration complete');
  }

}

module.exports = WallSwitch1Gang1WayDriver;
