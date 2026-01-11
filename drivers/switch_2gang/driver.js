'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Tuya Zigbee 2-Gang Switch Driver initialized');
  }

}

module.exports = TuyaZigbeeDriver;
