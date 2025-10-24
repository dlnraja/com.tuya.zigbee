'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LockFingerprintDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LockFingerprintDriver initialized');
  }
}

module.exports = LockFingerprintDriver;
