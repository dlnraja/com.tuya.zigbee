'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartOutdoorLightControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartOutdoorLightControllerDriver initialized');
  }
}

module.exports = ZemismartOutdoorLightControllerDriver;
