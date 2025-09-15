'use strict';

const Homey = require('homey');

class UltimateZigbeeHubApp extends Homey.App {

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('Ultimate Zigbee Hub v2.0.0 initialized');
    this.log('Professional device categorization with 103+ drivers');
    this.log('OTA firmware update support enabled');
    this.log('SDK3 compliant with local Zigbee 3.0 operation');
  }

}

module.exports = UltimateZigbeeHubApp;
