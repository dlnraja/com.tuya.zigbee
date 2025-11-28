'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SonoffSwitchDriver extends ZigBeeDriver {
  onInit() {
    this.log('Sonoff Switch driver initialized');
  }
}

module.exports = SonoffSwitchDriver;
