'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TouchSwitch2gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TouchSwitch2gangDriver initialized');
  }
}

module.exports = TouchSwitch2gangDriver;
