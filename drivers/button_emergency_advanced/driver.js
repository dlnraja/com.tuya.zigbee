'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MoesSosEmergencyButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MoesSosEmergencyButtonDriver initialized');
  }
}

module.exports = MoesSosEmergencyButtonDriver;
