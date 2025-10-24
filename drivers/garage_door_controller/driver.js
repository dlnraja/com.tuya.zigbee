'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartGarageDoorControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartGarageDoorControllerDriver initialized');
  }
}

module.exports = ZemismartGarageDoorControllerDriver;
