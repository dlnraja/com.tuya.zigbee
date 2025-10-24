'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWallSwitch3gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartWallSwitch3gangDriver initialized');
  }
}

module.exports = ZemismartWallSwitch3gangDriver;
