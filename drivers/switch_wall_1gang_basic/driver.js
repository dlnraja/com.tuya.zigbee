'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WallSwitch1gangDriver initialized');
  }
}

module.exports = WallSwitch1gangDriver;
