'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoCo2TempHumidityDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoCo2TempHumidityDriver initialized');
  }
}

module.exports = AvattoCo2TempHumidityDriver;
