'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RollerShutterSwitchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RollerShutterSwitchDriver initialized');
  }
}

module.exports = RollerShutterSwitchDriver;
