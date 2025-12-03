'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedControllerCctDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LedControllerCctDriver initialized');
  }

}

module.exports = LedControllerCctDriver;
