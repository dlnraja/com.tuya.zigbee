'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWallSwitch6gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWallSwitch6gangDriver initialized');
  }
}

module.exports = AvattoWallSwitch6gangDriver;
