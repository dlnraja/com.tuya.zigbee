'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartRollerShutterControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartRollerShutterControllerDriver initialized');
  }
}

module.exports = ZemismartRollerShutterControllerDriver;
