'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LockSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LockSmartDriver initialized');
  }
}

module.exports = LockSmartDriver;
