'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SosEmergencyButtonDriver initialized');
  }
}

module.exports = SosEmergencyButtonDriver;
