'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaDoorbellDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaDoorbellDriver initialized');
  }
}

module.exports = TuyaDoorbellDriver;
