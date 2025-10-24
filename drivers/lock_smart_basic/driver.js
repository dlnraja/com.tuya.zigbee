'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LockBasicDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LockBasicDriver initialized');
  }
}

module.exports = LockBasicDriver;
