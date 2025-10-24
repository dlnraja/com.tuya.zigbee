'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class OutletDriver extends ZigBeeDriver {

  async onInit() {
    this.log('OutletDriver initialized');
  }
}

module.exports = OutletDriver;
