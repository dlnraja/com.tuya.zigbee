'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SwitchTouch1GangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SwitchTouch1GangDriver initialized');
  }
}

module.exports = SwitchTouch1GangDriver;
