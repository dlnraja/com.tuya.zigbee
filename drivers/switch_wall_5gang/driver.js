'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch5gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WallSwitch5gangDriver initialized');
  }
}

module.exports = WallSwitch5gangDriver;
