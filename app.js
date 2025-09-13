'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {

  async onInit() {
    this.log('Tuya Zigbee App has been initialized');
    this.log('Supporting 650+ Tuya Zigbee devices with local communication only');
    this.log('Tuya Zigbee App ready - Professional device support enabled');
  }

}

module.exports = TuyaZigbeeApp;
