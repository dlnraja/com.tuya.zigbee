'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartDoorControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartDoorControllerDriver initialized');
  }
}

module.exports = ZemismartDoorControllerDriver;
