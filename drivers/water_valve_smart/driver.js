'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WaterValveSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WaterValveSmartDriver initialized');
  }
}

module.exports = WaterValveSmartDriver;
