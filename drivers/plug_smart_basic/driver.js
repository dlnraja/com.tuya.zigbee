'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PlugBasicDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PlugBasicDriver initialized');
  }
}

module.exports = PlugBasicDriver;
