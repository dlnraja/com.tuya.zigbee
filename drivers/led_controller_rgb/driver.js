'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedControllerRgbDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LedControllerRgbDriver initialized');
  }

}

module.exports = LedControllerRgbDriver;
