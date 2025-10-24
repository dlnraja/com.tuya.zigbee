'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch3gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WallSwitch3gangDriver initialized');
  }
}

module.exports = WallSwitch3gangDriver;
