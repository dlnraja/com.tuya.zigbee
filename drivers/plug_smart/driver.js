'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoPlugSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoPlugSmartDriver initialized');
  }
}

module.exports = AvattoPlugSmartDriver;
