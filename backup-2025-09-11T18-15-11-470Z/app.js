'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
  
  async onInit() {
    this.log('🚀 Tuya Zigbee App is running...');
  }
  
}

module.exports = TuyaZigbeeApp;