'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RollerShutterControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RollerShutterControllerDriver initialized');
  }
}

module.exports = RollerShutterControllerDriver;
