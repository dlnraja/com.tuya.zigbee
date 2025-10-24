'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class DoorControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('DoorControllerDriver initialized');
  }
}

module.exports = DoorControllerDriver;
