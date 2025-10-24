'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartSmartSwitch1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartSmartSwitch1gangDriver initialized');
  }
}

module.exports = ZemismartSmartSwitch1gangDriver;
