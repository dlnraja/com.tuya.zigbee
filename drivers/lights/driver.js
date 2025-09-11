'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LightsDriver extends ZigBeeDriver {

  onInit() {
    this.log('lights driver initialized');
    super.onInit();
  }

}

module.exports = LightsDriver;
