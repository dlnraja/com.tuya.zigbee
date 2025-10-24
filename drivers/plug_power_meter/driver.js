'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PowerMeterSocketDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PowerMeterSocketDriver initialized');
  }
}

module.exports = PowerMeterSocketDriver;
