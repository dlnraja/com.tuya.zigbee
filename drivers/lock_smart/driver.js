'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartLockSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartLockSmartDriver initialized');
  }
}

module.exports = ZemismartLockSmartDriver;
