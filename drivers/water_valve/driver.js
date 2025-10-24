'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWaterValveDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWaterValveDriver initialized');
  }
}

module.exports = AvattoWaterValveDriver;
