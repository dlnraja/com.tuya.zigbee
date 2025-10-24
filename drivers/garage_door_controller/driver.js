'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GarageDoorControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('GarageDoorControllerDriver initialized');
  }
}

module.exports = GarageDoorControllerDriver;
