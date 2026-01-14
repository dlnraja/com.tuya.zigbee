'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CeilingPresenceSensorDriver extends ZigBeeDriver {
  async onInit() {
    await super.onInit();
    this.log('Ceiling Presence Sensor (230V) Driver initialized');
  }
}

module.exports = CeilingPresenceSensorDriver;
