'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSmartSwitch4gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSmartSwitch4gangDriver initialized');
  }
}

module.exports = AvattoSmartSwitch4gangDriver;
