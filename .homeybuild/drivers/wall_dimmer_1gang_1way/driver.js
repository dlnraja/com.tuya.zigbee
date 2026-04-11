'use strict';

const Homey = require('homey');

class WallDimmer1Gang1WayDriver extends Homey.Driver {

  async onInit() {
    this.log('Wall Dimmer 1-Gang 1-Way Driver has been initialized');

    // v5.5.776: Flow cards are auto-registered by homeycompose from driver.flow.compose.json
    // Manual registration removed to prevent "Invalid Flow Card ID" errors
    // when driver.flow.compose.json is not properly compiled into app.json

    // Register backlight control flow card
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // ACTION: Set backlight mode
    try {
      this.homey.flow.getActionCard('wall_dimmer_1gang_1way_set_backlight')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const backlightValue = parseInt(args.mode, 10);
          this.log(`Flow: Setting backlight mode to ${backlightValue}`);

          // Send Tuya command for backlight (DP15)
          await args.device.sendTuyaCommand(15, backlightValue, 'enum');

          // Update the setting in Homey
          await args.device.setSettings({ backlight_mode: args.mode }).catch(() => {});

          return true;
        });
      this.log('✅ Flow card registered: wall_dimmer_1gang_1way_set_backlight');
    } catch (err) {
      this.log(`⚠️ Flow card registration failed: ${err.message}`);
    }
  }

  async onPairListDevices() {
    return [];
  }

}

module.exports = WallDimmer1Gang1WayDriver;
