'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class PresenceSensorRadarDriver extends ZigBeeDriver {
  onInit() {
    super.onInit();
    this.log('PresenceSensorRadarDriver initialized');
  }
}

module.exports = PresenceSensorRadarDriver;
