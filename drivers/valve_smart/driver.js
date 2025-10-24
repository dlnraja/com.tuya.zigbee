'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartValveSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartValveSmartDriver initialized');
  }
}

module.exports = ZemismartValveSmartDriver;
