'use strict';
const { ZigBeeDevice } = require('homey-zigbeedriver');

class Device extends ZigBeeDevice {
  async onNodeInit() {
    this.log('Device initialized');
    // Add your device logic here
  }
}

module.exports = Device;