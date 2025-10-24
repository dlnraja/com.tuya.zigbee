'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartPlugDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartPlugDriver initialized');
  }
}

module.exports = SmartPlugDriver;
