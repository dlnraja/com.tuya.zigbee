'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartSmartSwitch4gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartSmartSwitch4gangDriver initialized');
  }
}

module.exports = ZemismartSmartSwitch4gangDriver;
