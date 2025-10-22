'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartTouchSwitch3gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartTouchSwitch3gangDriver initialized');
  }
}

module.exports = ZemismartTouchSwitch3gangDriver;
