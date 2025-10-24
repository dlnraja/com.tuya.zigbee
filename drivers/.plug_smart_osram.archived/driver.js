'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoOsramSmartPlugDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoOsramSmartPlugDriver initialized');
  }
}

module.exports = AvattoOsramSmartPlugDriver;
