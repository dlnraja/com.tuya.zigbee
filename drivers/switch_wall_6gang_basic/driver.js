'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch6gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WallSwitch6gangDriver initialized');
  }
}

module.exports = WallSwitch6gangDriver;
