'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSmartPlugDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSmartPlugDriver initialized');
  }
}

module.exports = AvattoSmartPlugDriver;
