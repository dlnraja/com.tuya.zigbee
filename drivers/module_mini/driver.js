'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoMiniDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoMiniDriver initialized');
  }
}

module.exports = AvattoMiniDriver;
