'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWallSwitch1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartWallSwitch1gangDriver initialized');
  }
}

module.exports = ZemismartWallSwitch1gangDriver;
