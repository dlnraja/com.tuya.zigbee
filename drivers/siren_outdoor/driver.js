'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaOutdoorSirenDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaOutdoorSirenDriver initialized');
  }
}

module.exports = TuyaOutdoorSirenDriver;
