'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch4gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WallSwitch4gangDriver initialized');
  }
}

module.exports = WallSwitch4gangDriver;
