'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CeilingFanDriver extends ZigBeeDriver {

  async onInit() {
    this.log('CeilingFanDriver initialized');
  }
}

module.exports = CeilingFanDriver;
