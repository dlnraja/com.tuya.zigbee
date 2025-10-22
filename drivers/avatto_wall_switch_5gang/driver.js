'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWallSwitch5gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWallSwitch5gangDriver initialized');
  }
}

module.exports = AvattoWallSwitch5gangDriver;
