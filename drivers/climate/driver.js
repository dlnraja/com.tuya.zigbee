'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ClimateDriver extends ZigBeeDriver {

  onInit() {
    this.log('climate driver initialized');
    super.onInit();
  }

}

module.exports = ClimateDriver;
