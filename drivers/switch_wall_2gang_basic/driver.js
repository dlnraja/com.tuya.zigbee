'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch2gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WallSwitch2gangDriver initialized');
  }
}

module.exports = WallSwitch2gangDriver;
