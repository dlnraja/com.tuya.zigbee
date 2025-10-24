'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedStripRgbwDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LedStripRgbwDriver initialized');
  }
}

module.exports = LedStripRgbwDriver;
