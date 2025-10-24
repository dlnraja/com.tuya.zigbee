'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class OutdoorPlugDriver extends ZigBeeDriver {

  async onInit() {
    this.log('OutdoorPlugDriver initialized');
  }
}

module.exports = OutdoorPlugDriver;
