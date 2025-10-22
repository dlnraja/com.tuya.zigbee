'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscOsramLedStripRgbwDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscOsramLedStripRgbwDriver initialized');
  }
}

module.exports = LscOsramLedStripRgbwDriver;
