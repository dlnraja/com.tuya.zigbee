'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaDriver extends ZigBeeDriver {
  onInit() {
    this.log('Tuya Zigbee Driver initialized');
  }
}
module.exports = TuyaDriver;