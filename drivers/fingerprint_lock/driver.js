'use strict';

const { Driver } = require('homey');

class FingerprintLockDriver extends Driver {
  async onInit() {
    this.log('Fingerprint Lock driver initialized');
  }
}

module.exports = FingerprintLockDriver;
