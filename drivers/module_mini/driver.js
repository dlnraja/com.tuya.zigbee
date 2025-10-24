'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MiniDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MiniDriver initialized');
  }
}

module.exports = MiniDriver;
