'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedStripProDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LedStripProDriver initialized');
  }
}

module.exports = LedStripProDriver;
