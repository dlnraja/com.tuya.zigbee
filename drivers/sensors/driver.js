'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SensorsDriver extends ZigBeeDriver {

  onInit() {
    this.log('sensors driver initialized');
    super.onInit();
  }

}

module.exports = SensorsDriver;
