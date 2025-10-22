'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaDoorbellCameraDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaDoorbellCameraDriver initialized');
  }
}

module.exports = TuyaDoorbellCameraDriver;
