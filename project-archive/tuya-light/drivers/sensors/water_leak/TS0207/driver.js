'use strict';

const { ZigbeeDriver } = require('homey-zigbeedriver');
const TS0207Device = require('./device');

class TS0207Driver extends ZigbeeDriver {
  async onInit() {
    this.log('TS0207Driver has been initialized');
  }

  onPairListDevices() {
    return []; // No pairing, only manual adding
  }
}

module.exports = TS0207Driver;
