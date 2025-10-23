'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartTouchSwitch1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartTouchSwitch1gangDriver initialized');
  }
}

module.exports = ZemismartTouchSwitch1gangDriver;
