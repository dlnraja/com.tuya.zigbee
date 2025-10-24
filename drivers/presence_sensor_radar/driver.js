'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartPresenceSensorRadarDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartPresenceSensorRadarDriver initialized');
  }
}

module.exports = ZemismartPresenceSensorRadarDriver;
