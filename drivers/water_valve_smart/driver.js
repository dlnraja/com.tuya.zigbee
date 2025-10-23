'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWaterValveSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWaterValveSmartDriver initialized');
  }
}

module.exports = AvattoWaterValveSmartDriver;
