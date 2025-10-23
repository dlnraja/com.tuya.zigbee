'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWallSwitch4gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWallSwitch4gangDriver initialized');
  }
}

module.exports = AvattoWallSwitch4gangDriver;
