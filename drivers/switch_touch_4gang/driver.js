'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoTouchSwitch4gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoTouchSwitch4gangDriver initialized');
  }
}

module.exports = AvattoTouchSwitch4gangDriver;
