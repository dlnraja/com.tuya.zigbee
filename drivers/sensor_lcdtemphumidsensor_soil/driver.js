'use strict';
const { Driver } = require('homey');

class SoilLcdTempHumidDriver extends Driver {
  async onInit() {
    await super.onInit();
    this.log('Soil LCD Temp Humid Driver initialized');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = SoilLcdTempHumidDriver;
