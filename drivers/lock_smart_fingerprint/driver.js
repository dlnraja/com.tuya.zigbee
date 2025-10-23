'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartLockFingerprintDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartLockFingerprintDriver initialized');
  }
}

module.exports = ZemismartLockFingerprintDriver;
