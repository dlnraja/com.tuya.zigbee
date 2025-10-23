'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartRollerShutterSwitchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartRollerShutterSwitchDriver initialized');
  }
}

module.exports = ZemismartRollerShutterSwitchDriver;
