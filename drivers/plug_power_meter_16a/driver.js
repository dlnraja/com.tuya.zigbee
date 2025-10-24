'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartPlugPowerMeter16aDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartPlugPowerMeter16aDriver initialized');
  }
}

module.exports = SmartPlugPowerMeter16aDriver;
