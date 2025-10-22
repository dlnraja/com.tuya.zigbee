'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaGasSensorTs0601Driver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaGasSensorTs0601Driver initialized');
  }
}

module.exports = TuyaGasSensorTs0601Driver;
