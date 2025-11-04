'use strict';

const { Driver } = require('homey');

class SensorAirQualityFullDriver extends Driver {
  
  async onInit() {
    this.log('Air Quality Monitor Full driver has been initialized');
  }
}

module.exports = SensorAirQualityFullDriver;
