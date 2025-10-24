'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TouchSwitch1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TouchSwitch1gangDriver initialized');
  }
}

module.exports = TouchSwitch1gangDriver;
