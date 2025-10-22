'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class NousOsramOutdoorPlugDriver extends ZigBeeDriver {

  async onInit() {
    this.log('NousOsramOutdoorPlugDriver initialized');
  }
}

module.exports = NousOsramOutdoorPlugDriver;
