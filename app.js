'use strict';

const { HomeyApp } = require('homey');

// Driver imports


class TuyaZigbeeApp extends HomeyApp {
  async onInit() {
    this.log('Tuya Zigbee App is running...');
    
    // Register all drivers

  }
}

module.exports = TuyaZigbeeApp;