'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWallSwitch2gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWallSwitch2gangDriver initialized');
  }
}

module.exports = AvattoWallSwitch2gangDriver;
