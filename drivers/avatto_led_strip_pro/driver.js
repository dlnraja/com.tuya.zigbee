'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoLedStripProDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoLedStripProDriver initialized');
  }
}

module.exports = AvattoLedStripProDriver;
