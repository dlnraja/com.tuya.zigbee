'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PowerMeterDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PowerMeterDriver initialized');
  }

}

module.exports = PowerMeterDriver;
