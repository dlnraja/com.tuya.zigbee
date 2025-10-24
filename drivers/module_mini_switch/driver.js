'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MiniSwitchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MiniSwitchDriver initialized');
  }
}

module.exports = MiniSwitchDriver;
