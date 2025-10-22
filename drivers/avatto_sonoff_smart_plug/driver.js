'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSonoffSmartPlugDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSonoffSmartPlugDriver initialized');
  }
}

module.exports = AvattoSonoffSmartPlugDriver;
