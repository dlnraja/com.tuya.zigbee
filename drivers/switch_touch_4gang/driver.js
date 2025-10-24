'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TouchSwitch4gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TouchSwitch4gangDriver initialized');
  }
}

module.exports = TouchSwitch4gangDriver;
