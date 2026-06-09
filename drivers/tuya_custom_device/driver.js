'use strict';
const { Driver } = require('homey');

class TuyaCustomDeviceDriver extends Driver {
  async onInit() {
    this.log('Tuya Custom Device (Dynamic Override) Driver initialized');
  }
}

module.exports = TuyaCustomDeviceDriver;
