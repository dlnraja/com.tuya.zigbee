'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LonsonhoContactSensorBasicDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LonsonhoContactSensorBasicDriver initialized');
  }
}

module.exports = LonsonhoContactSensorBasicDriver;
