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

    // ACTION: Set backlight mode
    try {
      this.homey.flow.getActionCard('wall_switch_1gang_1way_set_backlight')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          this.log(`Flow: Setting backlight mode to ${args.mode}`);

          // Map string mode to enum value for Tuya DP15
          const backlightValue = { off: 0, normal: 1, inverted: 2 }[args.mode] ?? 1;

          // v5.5.941: Send via device's setBacklight method or direct Tuya DP
          if (typeof args.device.setBacklight === 'function') {
            await args.device.setBacklight(backlightValue);
          } else {
            // Direct Tuya DP15 for backlight
            const ep = args.device.zclNode?.endpoints?.[1];
            const tuyaCluster = ep?.clusters?.tuya || ep?.clusters?.[61184];
            if (tuyaCluster?.datapoint) {
              const cmd = Buffer.alloc(7);
              cmd.writeUInt16BE(Math.floor(Math.random() * 65535), 0);
              cmd[2] = 15; cmd[3] = 4; cmd.writeUInt16BE(1, 4); cmd[6] = backlightValue;
              await tuyaCluster.datapoint({ data: cmd });
            }
          }

          // Update the setting in Homey
          await args.device.setSettings({ backlight_mode: args.mode }).catch(() => {});

          return true;
        });
      this.log('✅ Flow card registered: wall_switch_1gang_1way_set_backlight');
    } catch (err) {
      this.log(`⚠️ Flow card registration failed: ${err.message}`);
    }

    this.log('Flow cards registration complete');
  }

}

module.exports = WallSwitch1Gang1WayDriver;
