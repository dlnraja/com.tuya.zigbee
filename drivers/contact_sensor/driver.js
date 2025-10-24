'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LonsonhoSamsungContactSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LonsonhoSamsungContactSensorDriver initialized');
  }
}

module.exports = LonsonhoSamsungContactSensorDriver;
