'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaSoilTesterTempHumidDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaSoilTesterTempHumidDriver initialized');
  }
}

module.exports = TuyaSoilTesterTempHumidDriver;
