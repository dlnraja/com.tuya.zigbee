'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class OutdoorLightControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('OutdoorLightControllerDriver initialized');
  }
}

module.exports = OutdoorLightControllerDriver;
