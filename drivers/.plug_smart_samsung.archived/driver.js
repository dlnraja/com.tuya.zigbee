'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSamsungSmartPlugDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSamsungSmartPlugDriver initialized');
  }
}

module.exports = AvattoSamsungSmartPlugDriver;
