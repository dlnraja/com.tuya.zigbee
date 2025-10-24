'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoRadiatorValveDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoRadiatorValveDriver initialized');
  }
}

module.exports = AvattoRadiatorValveDriver;
