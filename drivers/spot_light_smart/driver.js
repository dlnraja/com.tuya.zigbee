'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartSpotDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartSpotDriver initialized');
  }
}

module.exports = SmartSpotDriver;
