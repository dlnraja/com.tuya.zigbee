'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSosEmergencyButtonDriver initialized');
  }
}

module.exports = AvattoSosEmergencyButtonDriver;
