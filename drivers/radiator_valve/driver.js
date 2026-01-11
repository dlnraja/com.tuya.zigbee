'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RadiatorValveDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RadiatorValveDriver initialized');
  }
}

module.exports = RadiatorValveDriver;
