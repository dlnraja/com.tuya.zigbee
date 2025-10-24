'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WaterValveDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WaterValveDriver initialized');
  }
}

module.exports = WaterValveDriver;
