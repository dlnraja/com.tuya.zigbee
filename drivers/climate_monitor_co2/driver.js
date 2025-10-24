'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Co2TempHumidityDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Co2TempHumidityDriver initialized');
  }
}

module.exports = Co2TempHumidityDriver;
