'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoTouchSwitch2gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoTouchSwitch2gangDriver initialized');
  }
}

module.exports = AvattoTouchSwitch2gangDriver;
