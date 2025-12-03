'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZigbeeUniversalDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZigbeeUniversalDriver initialized');
  }
}

module.exports = ZigbeeUniversalDriver;
