'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedStripOutdoorColorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LedStripOutdoorColorDriver initialized');
  }
}

module.exports = LedStripOutdoorColorDriver;
