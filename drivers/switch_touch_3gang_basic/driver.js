'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TouchSwitch3gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TouchSwitch3gangDriver initialized');
  }
}

module.exports = TouchSwitch3gangDriver;
