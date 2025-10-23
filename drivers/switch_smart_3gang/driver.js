'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartSmartSwitch3gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartSmartSwitch3gangDriver initialized');
  }
}

module.exports = ZemismartSmartSwitch3gangDriver;
