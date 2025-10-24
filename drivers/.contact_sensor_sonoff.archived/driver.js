'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LonsonhoSonoffContactSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LonsonhoSonoffContactSensorDriver initialized');
  }
}

module.exports = LonsonhoSonoffContactSensorDriver;
