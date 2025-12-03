'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PresenceSensorRadarDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PresenceSensorRadarDriver initialized');
  }
}

module.exports = PresenceSensorRadarDriver;
