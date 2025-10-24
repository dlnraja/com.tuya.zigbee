'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchTouch3GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchTouch3GangDriver initialized');
  }
}

module.exports = SwitchTouch3GangDriver;
