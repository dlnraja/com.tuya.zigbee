'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartSwitch5gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartSwitch5gangDriver initialized');
  }
}

module.exports = ZemismartSwitch5gangDriver;
