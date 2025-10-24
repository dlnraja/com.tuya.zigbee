'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSmartPlugPowerMeter16aDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSmartPlugPowerMeter16aDriver initialized');
  }
}

module.exports = AvattoSmartPlugPowerMeter16aDriver;
