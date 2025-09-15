'use strict';

const { ZigbeeDriver } = require('homey-zigbeedriver');
const TS0201Device = require('./device');

class TS0201Driver extends ZigbeeDriver {
  async onInit() {
    this.log('TS0201Driver has been initialized');
  }

  onPairListDevices() {
    return []; // No pairing, only manual adding
  }
}

module.exports = TS0201Driver;
