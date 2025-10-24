'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RollerBlindControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RollerBlindControllerDriver initialized');
  }
}

module.exports = RollerBlindControllerDriver;
