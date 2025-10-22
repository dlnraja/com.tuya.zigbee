'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoPowerMeterSocketDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoPowerMeterSocketDriver initialized');
  }
}

module.exports = AvattoPowerMeterSocketDriver;
