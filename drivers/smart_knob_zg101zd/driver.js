'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartKnobZg101zdDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    this.log('Smart knob ZG-101ZD driver initialized');
  }
}

module.exports = SmartKnobZg101zdDriver;
