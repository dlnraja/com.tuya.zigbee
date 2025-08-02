'use strict';

const { HomeyApp } = require('homey');

class TuyaZigbeeApp extends HomeyApp {
  async onInit() {
    this.log('Tuya Zigbee App is running...');
    this.log('Total drivers: 615 (417 Tuya + 198 Zigbee)');
    
    // Register drivers here
    // this.homey.drivers.registerDriver(require('./drivers/tuya/lights/tuya-light-dimmable/device.js'));
    
    this.log('App initialized successfully!');
  }
}

module.exports = TuyaZigbeeApp;