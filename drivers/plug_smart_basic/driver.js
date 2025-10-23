'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoPlugBasicDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoPlugBasicDriver initialized');
  }
}

module.exports = AvattoPlugBasicDriver;
