'use strict';

const { Driver } = require('homey');

/**
 * Wireless Scene Controller 4-Button (Battery) Driver
 */
class WirelessSceneController4buttonBatteryDriver extends Driver {

  async onInit() {
    this.log('wireless_scene_controller_4button_battery driver initialized');
  }

  async onPair(session) {
    this.log('Pairing wireless_scene_controller_4button_battery...');
    
    session.setHandler('list_devices', async () => {
      return [];
    });
  }

}

module.exports = WirelessSceneController4buttonBatteryDriver;
