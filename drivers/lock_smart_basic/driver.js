'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartLockBasicDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartLockBasicDriver initialized');
  }
}

module.exports = ZemismartLockBasicDriver;
