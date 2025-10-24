'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoCeilingFanDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoCeilingFanDriver initialized');
  }
}

module.exports = AvattoCeilingFanDriver;
