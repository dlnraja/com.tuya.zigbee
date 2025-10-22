'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartSwitch1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartSwitch1gangDriver initialized');
  }
}

module.exports = ZemismartSwitch1gangDriver;
