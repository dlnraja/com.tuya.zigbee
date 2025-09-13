'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class IkeaTradfriBulbDriver extends ZigBeeDriver {

  onInit() {
    this.log('ikea_tradfri_bulb driver initialized');
    super.onInit();
  }

}

module.exports = IkeaTradfriBulbDriver;
