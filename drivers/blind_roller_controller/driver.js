'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartRollerBlindControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartRollerBlindControllerDriver initialized');
  }
}

module.exports = ZemismartRollerBlindControllerDriver;
