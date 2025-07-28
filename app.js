'use strict';

const { Homey } = require('homey');

class TuyaZigbeeApp extends Homey.App {
  async onInit() {
    this.log('Tuya Zigbee Universal Integration is running...');
  }
}

module.exports = TuyaZigbeeApp; 