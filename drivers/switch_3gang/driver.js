'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Tuya Zigbee 3-Gang Switch Driver initialized');
  }

}

module.exports = TuyaZigbeeDriver;
