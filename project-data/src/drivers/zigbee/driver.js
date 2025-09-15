'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZigbeeDriver extends ZigBeeDriver {

  onInit() {
    this.log('zigbee driver initialized');
    super.onInit();
  }

}

module.exports = ZigbeeDriver;
